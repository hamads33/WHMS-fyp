// src/modules/backup/worker/restoreRunner.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const zlib = require("zlib");
const tar = require("tar-stream");
const { createProviderInstance } = require("../provider/registry");
const storageConfigService = require("../storageConfig.service");
const eventBus = require("../eventBus");

async function performRestoreJob(backupId, payload = {}) {
  try {
    // Step 1: Lookup backup record
    const backup = await prisma.backup.findUnique({
      where: { id: backupId }
    });
    if (!backup) throw new Error("Backup not found");

    const { destination, restoreFiles = true, restoreDb = false } = payload;

    // Step Log: restore_started
    await prisma.backupStepLog.create({
      data: { backupId, step: "restore_started", status: "running" }
    });
    eventBus.emit("backup.restore.started", { backupId });

    // Step 2: Create provider instance
    const conf = await storageConfigService.decryptAndReturnConfig(
      backup.storageConfigId
    );

    const provider = createProviderInstance(conf.provider, conf);

    // Step Log: download_started
    await prisma.backupStepLog.create({
      data: { backupId, step: "download_started", status: "running" }
    });

    // Step 3: Download backup archive stream
    const archiveStream = await provider.downloadStream(backup.filePath);

    // Step Log: extract_started
    await prisma.backupStepLog.create({
      data: { backupId, step: "extract_started", status: "running" }
    });

    // Step 4: Extract tar.gz
    await extractTarGzStream(archiveStream, destination);

    // Step Log: extract_completed
    await prisma.backupStepLog.create({
      data: { backupId, step: "extract_completed", status: "success" }
    });

    // Optional: Database restore
    if (restoreDb) {
      // Placeholder — Postgres restore logic can be added here
      await prisma.backupStepLog.create({
        data: { backupId, step: "db_restore_skipped", status: "success" }
      });
    }

    // Step Log: restore_finished
    await prisma.backupStepLog.create({
      data: { backupId, step: "restore_finished", status: "success" }
    });
    eventBus.emit("backup.restore.success", { backupId });

    return { success: true };
  } catch (err) {
    console.error("[restoreRunner] Error:", err);

    await prisma.backupStepLog.create({
      data: {
        backupId,
        step: "restore_failed",
        status: "error",
        meta: { error: err.message }
      }
    });

    eventBus.emit("backup.restore.failed", { backupId, error: err.message });
    throw err;
  }
}

/**
 * Extract tar.gz from stream
 */
async function extractTarGzStream(stream, destination) {
  return new Promise((resolve, reject) => {
    const extract = tar.extract();

    extract.on("entry", async (header, entryStream, next) => {
      const destPath = path.join(destination, header.name);

      if (header.type === "directory") {
        await fse.ensureDir(destPath);
        entryStream.resume();
        next();
      } else {
        await fse.ensureDir(path.dirname(destPath));
        const writeStream = fs.createWriteStream(destPath);
        entryStream.pipe(writeStream);

        writeStream.on("finish", () => next());
      }
    });

    extract.on("finish", () => resolve());

    stream
      .pipe(zlib.createGunzip())
      .pipe(extract)
      .on("error", reject);
  });
}

module.exports = { performRestoreJob };
