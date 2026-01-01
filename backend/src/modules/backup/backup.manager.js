const path = require("path");
const fs = require("fs-extra");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const eventBus = require("./eventBus");
const storageConfigService = require("./storageConfig.service");
const { createProviderInstance } = require("./provider/registry");
const { tarGzFromFilesStream } = require("./utils/streamTarGz");

/**
 * FIX: Using your preferred pgDumptofile utility.
 * Ensure the file path matches: src/modules/backup/db/pgDumptofile.js
 */
const { pgDumpToTempFile } = require("./db/pgDumptofile");
const { enqueueBackupJob } = require("./worker/queue");

/* =========================================================
   SECURITY: PATH VALIDATION
   FIX: Added to prevent path traversal attacks
========================================================= */
function validateFilePath(filePath) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid file path");
  }

  const normalized = path.normalize(filePath);

  // Prevent path traversal
  if (normalized.includes("..")) {
    throw new Error("Path traversal not allowed");
  }

  // Prevent accessing sensitive system files
  const sensitivePatterns = [
    "/etc/shadow",
    "/etc/passwd",
    "/.ssh/",
    "/root/",
  ];

  for (const pattern of sensitivePatterns) {
    if (normalized.includes(pattern)) {
      throw new Error("Access to sensitive paths not allowed");
    }
  }

  return normalized;
}

/* =========================================================
   CONFIGURATION: SIZE LIMITS
   FIX: Added to prevent disk exhaustion
========================================================= */
const MAX_BACKUP_SIZE = process.env.MAX_BACKUP_SIZE_GB
  ? parseInt(process.env.MAX_BACKUP_SIZE_GB) * 1024 * 1024 * 1024
  : 10 * 1024 * 1024 * 1024; // 10GB default

/* =========================================================
   STEP LOGGER (NON-BLOCKING)
========================================================= */
async function recordStep(
  backupId,
  step,
  status = "started",
  meta = {},
  message = null
) {
  try {
    await prisma.backupStepLog.create({
      data: { backupId, step, status, meta, message },
    });
  } catch (err) {
    console.error("recordStep failed:", err.message);
  }
}

/* =========================================================
   API ENTRYPOINT
========================================================= */
async function runBackup({
  userId,
  type = "full",
  storageConfigId = null,
  files = [],
  name = null,
  dbOptions = {},
  retentionDays = 30,
}) {
  if (storageConfigId) {
    const sc = await prisma.storageConfig.findUnique({
      where: { id: Number(storageConfigId) },
    });

    if (!sc) throw new Error("Storage config not found");
    if (String(sc.createdById) !== String(userId)) {
      throw new Error("Access denied to storage config");
    }
  }

  const rec = await prisma.backup.create({
    data: {
      name: name || `backup-${Date.now()}`,
      type,
      storageConfigId: storageConfigId ? Number(storageConfigId) : null,
      retentionDays: Number(retentionDays),
      createdById: userId,
      status: "queued",
    },
  });

  await enqueueBackupJob(rec.id, {
    userId,
    type,
    storageConfigId,
    files,
    dbOptions,
  });

  eventBus.emit("backup.queued", { backupId: rec.id, userId });
  return rec;
}

/* =========================================================
   WORKER EXECUTION LOGIC
========================================================= */
async function performBackupJob(backupId, jobPayload = {}) {
  const rec = await prisma.backup.findUnique({ where: { id: backupId } });
  if (!rec) throw new Error("Backup record not found");

  await prisma.backup.update({
    where: { id: rec.id },
    data: { status: "running", startedAt: new Date() },
  });

  await recordStep(rec.id, "job_started", "success");
  eventBus.emit("backup.started", {
    backupId: rec.id,
    userId: rec.createdById,
  });

  let providerInstance;
  let providerId = "local";
  const tempDirs = [];

  try {
    /* ---------------------------------------
       1. PROVIDER INITIALIZATION
    ---------------------------------------- */
    if (rec.storageConfigId) {
      const conf = await storageConfigService.decryptAndReturnConfig(
        rec.storageConfigId
      );
      if (!conf) throw new Error("Could not decrypt storage configuration");

      providerId = conf.provider;
      providerInstance = createProviderInstance(providerId, conf);
    } else {
      providerInstance = createProviderInstance("local", {});
    }

    await recordStep(rec.id, "provider_ready", "success", {
      provider: providerId,
    });

    /* ---------------------------------------
       2. NORMALIZE & VALIDATE FILE INPUTS
       FIX: Added path validation
    ---------------------------------------- */
    const filePaths = Array.isArray(jobPayload.files)
      ? jobPayload.files
          .map((f) => {
            const rawPath = typeof f === "string" ? f : f.path;
            if (!rawPath) return null;

            try {
              // Validate path for security
              return validateFilePath(rawPath);
            } catch (err) {
              console.error(`Invalid path skipped: ${rawPath}`, err.message);
              return null;
            }
          })
          .filter(Boolean)
      : [];

    let archiveFiles = [...filePaths];

    /* ---------------------------------------
       3. DATABASE DUMP (TEMP FILE LOGIC)
    ---------------------------------------- */
    if (rec.type === "db" || rec.type === "full") {
      await recordStep(rec.id, "db_dump_started", "started");

      // FIX: Use your pgDumptofile utility to create a physical temp file
      const dbFile = await pgDumpToTempFile(jobPayload.dbOptions || {});
      archiveFiles.push(dbFile);

      // Track directory for cleanup in the 'finally' block
      tempDirs.push(path.dirname(dbFile));

      await recordStep(rec.id, "db_dump_finished", "success");
    }

    if (archiveFiles.length === 0) {
      throw new Error("No files selected for backup");
    }

    /* ---------------------------------------
       4. CREATE ARCHIVE & UPLOAD
    ---------------------------------------- */
    const archiveStream = tarGzFromFilesStream(archiveFiles);

    await recordStep(rec.id, "archive_ready", "success");

    const remotePath = `${rec.name.replace(/\s+/g, "_")}-${Date.now()}.tar.gz`;

    await recordStep(rec.id, "upload_started", "started", { remotePath });
    await providerInstance.uploadStream(archiveStream, remotePath);

    /* ---------------------------------------
       5. FINALIZE & VERSIONING
    ---------------------------------------- */
    let sizeBytes = null;
    try {
      if (typeof providerInstance.stat === "function") {
        const st = await providerInstance.stat(remotePath);
        if (st?.size) {
          sizeBytes = st.size;

          // FIX: Check size limits
          if (sizeBytes > MAX_BACKUP_SIZE) {
            throw new Error(
              `Backup size ${(sizeBytes / 1024 / 1024 / 1024).toFixed(2)}GB exceeds limit of ${(MAX_BACKUP_SIZE / 1024 / 1024 / 1024).toFixed(2)}GB`
            );
          }
        }
      }
    } catch (err) {
      // If it's a size limit error, re-throw it
      if (err.message.includes("exceeds limit")) {
        throw err;
      }
      // Otherwise just log and continue (stat is optional)
      console.warn("stat() failed:", err.message);
    }

    await prisma.backup.update({
      where: { id: rec.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        filePath: remotePath,
        sizeBytes,
      },
    });

    // Versioning for compliance with FR-BKP-04
    await prisma.backupVersion.create({
      data: {
        backupId: rec.id,
        version: 1,
        filePath: remotePath,
        sizeBytes,
      },
    });

    await recordStep(rec.id, "upload_finished", "success", {
      remotePath,
      sizeBytes,
    });

    eventBus.emit("backup.success", {
      backupId: rec.id,
      provider: providerId,
    });

    return true;
  } catch (err) {
    console.error("performBackupJob error:", err);

    await prisma.backup.update({
      where: { id: rec.id },
      data: {
        status: "failed",
        errorMessage: err.message,
        finishedAt: new Date(),
      },
    });

    await recordStep(rec.id, "job_failed", "failed", {
      error: err.message,
    });

    eventBus.emit("backup.failed", {
      backupId: rec.id,
      error: err.message,
    });

    throw err;
  } finally {
    /* ---------------------------------------
       6. CLEANUP TEMPORARY FILES
    ---------------------------------------- */
    for (const dir of tempDirs) {
      try {
        await fs.remove(dir);
      } catch (_) {
        /* ignore cleanup errors */
      }
    }
  }
}

module.exports = {
  runBackup,
  performBackupJob,
  recordStep,
};