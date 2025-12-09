// src/modules/backup/backup.manager.js
const path = require("path");
const os = require("os");
const fs = require("fs-extra");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const eventBus = require("./eventBus");
const storageConfigService = require("./storageConfig.service");
const { createProviderInstance } = require("./provider/registry");
const { tarGzFromFilesStream } = require("./utils/streamTarGz");
const { pgDumpToGzipStream } = require("./db/pgDumpStream");
const { enqueueBackupJob } = require("./worker/queue"); // uses your existing queue wrapper

/**
 * Helper to write step logs (non-blocking)
 */
async function recordStep(backupId, step, status = "started", meta = {}, message = null) {
  try {
    await prisma.backupStepLog.create({
      data: {
        backupId,
        step,
        status,
        meta,
        message
      }
    });
  } catch (err) {
    console.error("recordStep failed:", err.message);
  }
}

/**
 * Run API entrypoint — create DB record + enqueue
 */
async function runBackup({ userId, type = "full", storageConfigId = null, files = [], name = null, dbOptions = {}, retentionDays = 30 }) {
  // validate user & storageConfig ownership
  if (storageConfigId) {
    const sc = await prisma.storageConfig.findUnique({ where: { id: Number(storageConfigId) }});
    if (!sc) throw new Error("Storage config not found");
    if (String(sc.createdById) !== String(userId)) {
      // admins may implement cross-tenant behavior; for now deny
      throw new Error("Access denied to storage config");
    }
  }

  const rec = await prisma.backup.create({
    data: {
      name: name || `backup-${Date.now()}`,
      type,
      storageConfigId: storageConfigId ? Number(storageConfigId) : null,
      retentionDays,
      createdById: userId,
      status: "queued"
    }
  });

  // queue job
  await enqueueBackupJob(rec.id, { userId, type, storageConfigId, files, dbOptions });

  // emit event
  eventBus.emit("backup.queued", { backupId: rec.id, userId });

  return rec;
}

/**
 * The actual job logic executed by worker.
 * jobPayload should include: userId, type, storageConfigId, files, dbOptions
 */
async function performBackupJob(backupId, jobPayload = {}) {
  const rec = await prisma.backup.findUnique({ where: { id: backupId }});
  if (!rec) throw new Error("Backup record not found");

  await prisma.backup.update({ where: { id: rec.id }, data: { status: "running", startedAt: new Date() }});
  await recordStep(rec.id, "job_started", "success", { pid: process.pid });

  eventBus.emit("backup.started", { backupId: rec.id, userId: rec.createdById });

  let providerInstance = null;
  let providerId = "local";

  try {
    // 1) instantiate provider
    if (rec.storageConfigId) {
      const conf = await storageConfigService.decryptAndReturnConfig(rec.storageConfigId);
      if (!conf) throw new Error("Failed to decrypt storage config");
      providerId = conf.provider;
      providerInstance = createProviderInstance(providerId, conf);
    } else {
      providerInstance = createProviderInstance("local", { localPath: null });
    }

    await recordStep(rec.id, "provider_ready", "success", { provider: providerId });

    // 2) produce archive stream depending on type
    let archiveStream = null;
    if (rec.type === "full") {
      await recordStep(rec.id, "prepare_db_dump", "started");
      const dbStream = pgDumpToGzipStream({
        host: jobPayload.dbOptions?.host,
        port: jobPayload.dbOptions?.port || 5432,
        user: jobPayload.dbOptions?.user,
        password: jobPayload.dbOptions?.password,
        database: jobPayload.dbOptions?.database,
        pgDumpPath: jobPayload.dbOptions?.pgDumpPath || "pg_dump",
      });
      await recordStep(rec.id, "prepare_db_dump", "success");
      archiveStream = await tarGzFromFilesStream(jobPayload.files || [], [
        { name: "db.sql.gz", stream: dbStream }
      ]);
    } else if (rec.type === "db") {
      await recordStep(rec.id, "prepare_db_dump", "started");
      const dbStream = pgDumpToGzipStream({
        host: jobPayload.dbOptions?.host,
        port: jobPayload.dbOptions?.port || 5432,
        user: jobPayload.dbOptions?.user,
        password: jobPayload.dbOptions?.password,
        database: jobPayload.dbOptions?.database,
        pgDumpPath: jobPayload.dbOptions?.pgDumpPath || "pg_dump",
      });
      await recordStep(rec.id, "prepare_db_dump", "success");
      // wrap single db file into tar for consistent download handling
      archiveStream = await tarGzFromFilesStream([], [{ name: "db.sql.gz", stream: dbStream }]);
    } else if (rec.type === "files") {
      archiveStream = await tarGzFromFilesStream(jobPayload.files || [], []);
    } else {
      throw new Error(`Unknown backup type: ${rec.type}`);
    }

    await recordStep(rec.id, "archive_ready", "success");

    // 3) remote path & upload
    const remotePath = `${rec.name.replace(/\s+/g, "_")}-${Date.now()}.tar.gz`;
    await recordStep(rec.id, "upload_started", "started", { remotePath });

    // provider must implement uploadStream(readable, remotePath)
    await providerInstance.uploadStream(archiveStream, remotePath);

    // optional: try stat to get size
    let sizeBytes = null;
    try {
      if (typeof providerInstance.stat === "function") {
        const st = await providerInstance.stat(remotePath);
        if (st && st.size) sizeBytes = st.size;
      }
    } catch (e) {
      // not fatal
      console.warn("stat failed:", e.message);
    }

    // 4) update DB
    await prisma.backup.update({
      where: { id: rec.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        filePath: remotePath,
        sizeBytes
      }
    });

    // 5) create version record
    await prisma.backupVersion.create({
      data: {
        backupId: rec.id,
        version: 1,
        filePath: remotePath,
        sizeBytes
      }
    });

    await recordStep(rec.id, "upload_finished", "success", { remotePath, sizeBytes });

    // emit events
    eventBus.emit("backup.success", { backupId: rec.id, userId: rec.createdById, provider: providerId, filePath: remotePath });

    return true;
  } catch (err) {
    console.error("performBackupJob error:", err);
    await prisma.backup.update({
      where: { id: rec.id },
      data: { status: "failed", errorMessage: err.message, finishedAt: new Date() }
    });
    await recordStep(rec.id, "job_failed", "failed", { error: err.message });
    eventBus.emit("backup.failed", { backupId: rec.id, error: err.message });
    throw err;
  }
}

module.exports = {
  runBackup,
  performBackupJob,
  recordStep
};
