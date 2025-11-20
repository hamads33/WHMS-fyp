const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { compressToTarGz, runDbDump } = require('../utils/zip.util');
const FTPAdapter = require('./ftpBackup.service');
const SFTPAdapter = require('./sftpBackup.service');
const { enqueueBackupJob } = require('../workers/backupCron.worker');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const storageConfigService = require('./storageConfig.service');

/* ------------------------------------------------------
   CREATE BACKUP + QUEUE
------------------------------------------------------ */
async function createAndEnqueueBackup(userId, payload) {
  const {
    name,
    type = 'full',
    storageConfigId = null,
    storageConfig: rawConfig = null,
    retention_days = 30,
  } = payload;

  let scRec = null;

  if (storageConfigId) {
    scRec = await prisma.storageConfig.findUnique({
      where: { id: Number(storageConfigId) }
    });
    if (!scRec) throw new Error("Storage config not found");
  }

  // Raw config → save to DB
  let finalStorageId = storageConfigId;
  if (!finalStorageId && rawConfig) {
    const created = await storageConfigService.createStorageConfig({
      name: name ? `${name}-config` : `cfg-${Date.now()}`,
      provider: rawConfig.provider,
      config: rawConfig,
      createdById: userId
    });

    finalStorageId = created.id;
    scRec = created;
  }

  // Create backup record
  const rec = await prisma.backup.create({
    data: {
      name: name || `backup-${Date.now()}`,
      type,
      storageConfigId: finalStorageId ? Number(finalStorageId) : null,
      retentionDays: retention_days,
      createdById: userId,
      status: "pending"
    }
  });

  await enqueueBackupJob(rec.id);
  return rec;
}

/* ------------------------------------------------------
   LIST BACKUPS
------------------------------------------------------ */
async function list() {
  return prisma.backup.findMany({
    orderBy: { createdAt: 'desc' },
    include: { storageConfig: true }
  });
}

/* ------------------------------------------------------
   GET BACKUP
------------------------------------------------------ */
async function getById(id) {
  return prisma.backup.findUnique({
    where: { id: Number(id) },
    include: { storageConfig: true }
  });
}

/* ------------------------------------------------------
   DELETE BACKUP
------------------------------------------------------ */
async function cancelAndDelete(id) {
  // TODO: delete remote file
  return prisma.backup.delete({ where: { id: Number(id) }});
}

/* ------------------------------------------------------
   PROCESS BACKUP JOB
------------------------------------------------------ */
async function processBackupJob(backupId) {
  const rec = await getById(backupId);
  if (!rec) throw new Error("Backup record not found");

  await prisma.backup.update({
    where: { id: rec.id },
    data: { status: "running", startedAt: new Date() }
  });

  const tmpDir = path.join(os.tmpdir(), `backup-${rec.id}-${Date.now()}`);
  await fs.ensureDir(tmpDir);

  try {
    const sources = [];

    /* ----------------------- LOAD STORAGE CONFIG ----------------------- */
    let storageConfRaw = null;

    if (rec.storageConfigId) {
      const sc = await storageConfigService.getStorageConfig(rec.storageConfigId);

      if (!sc) throw new Error("Storage config missing!");

      const decrypted = storageConfigService.decrypt(sc.config);

      if (!decrypted)
        throw new Error("Failed to decrypt storage config (KEY mismatch?)");

      decrypted.provider = sc.provider;
      storageConfRaw = decrypted;
    }

    /* ----------------------- DATABASE BACKUP ----------------------- */
    if (rec.type === "db" || rec.type === "full") {
      const dbOut = path.join(tmpDir, `db-dump-${rec.id}.sql`);

      const dbOpts = (storageConfRaw && storageConfRaw.db) || {};

      await runDbDump({
        engine: dbOpts.engine || "pg",
        host: dbOpts.host || "localhost",
        port: dbOpts.port || 5431,
        user: dbOpts.user,
        password: dbOpts.password,
        database: dbOpts.database,
        outFile: dbOut
      });

      sources.push(dbOut);
    }

    /* ----------------------- FILE BACKUP ----------------------- */
    if (rec.type === "files" || rec.type === "full") {
      const files = (storageConfRaw && storageConfRaw.files) || [];

      for (const f of files) {
        const dest = path.join(tmpDir, path.basename(f));
        await fs.copy(f, dest, { dereference: true });
        sources.push(dest);
      }
    }

    /* ----------------------- NO FILES / NO DB → CREATE MARKER ----------------------- */
    if (sources.length === 0) {
      const marker = path.join(tmpDir, "empty.txt");
      await fs.writeFile(marker, `backup ${rec.id} @ ${new Date().toISOString()}`);
      sources.push(marker);
    }

    /* ----------------------- COMPRESS ----------------------- */
    const archiveName = `${rec.name.replace(/\s+/g, "_")}-${Date.now()}.tar.gz`;
    const outPath = path.join(tmpDir, archiveName);

    await compressToTarGz(sources, outPath);
    const stats = await fs.stat(outPath);

    /* ----------------------- UPLOAD ----------------------- */
    const provider = storageConfRaw?.provider || "local";
    const remotePath =
      (storageConfRaw?.remotePath || "/backups") + "/" + archiveName;

    if (provider === "ftp" || provider === "ftps") {
      const adapter = FTPAdapter(storageConfRaw);
      await adapter.upload(outPath, remotePath);
    } else if (provider === "sftp") {
      const adapter = SFTPAdapter(storageConfRaw);
      await adapter.upload(outPath, remotePath);
    } else {
      /* LOCAL */
      const destFolder =
        storageConfRaw?.localPath || path.join(process.cwd(), "storage", "backups");

      await fs.ensureDir(destFolder);
      const dest = path.join(destFolder, archiveName);
      await fs.move(outPath, dest, { overwrite: true });
    }

    /* ----------------------- UPDATE SUCCESS ----------------------- */
    await prisma.backup.update({
      where: { id: rec.id },
      data: {
        status: "success",
        filePath: remotePath,
        sizeBytes: stats.size,
        finishedAt: new Date()
      }
    });

  } catch (err) {
    console.error("❌ processBackupJob error:", err);

    await prisma.backup.update({
      where: { id: rec.id },
      data: {
        status: "failed",
        errorMessage: err.message,
        finishedAt: new Date()
      }
    });

    throw err;

  } finally {
    try {
      await fs.remove(tmpDir);
    } catch (e) {
      console.warn("cleanup tmpDir failed", e);
    }
  }
}

/* ------------------------------------------------------ */
module.exports = {
  createAndEnqueueBackup,
  list,
  getById,
  cancelAndDelete,
  processBackupJob
};
