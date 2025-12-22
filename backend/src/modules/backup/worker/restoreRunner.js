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
const { PassThrough } = require("stream");

async function performRestoreJob(backupId, payload = {}) {
  try {
    const backup = await prisma.backup.findUnique({ where: { id: backupId } });
    if (!backup) throw new Error("Backup not found");

    const { destination, restoreFiles = true, restoreDb = false } = payload;
    
    await prisma.backupStepLog.create({ 
      data: { backupId, step: "restore_started", status: "running" } 
    });
    eventBus.emit("backup.restore.started", { backupId });

    /* ---------------------------------------------------------
       FIX: Handle Local provider (null storageConfigId)
    --------------------------------------------------------- */
    let provider;
    if (backup.storageConfigId) {
      const conf = await storageConfigService.decryptAndReturnConfig(backup.storageConfigId);
      provider = createProviderInstance(conf.provider, conf);
    } else {
      // Fallback to local provider if no config ID exists
      provider = createProviderInstance("local", {});
    }

    await prisma.backupStepLog.create({ 
      data: { backupId, step: "download_started", status: "running" } 
    });

    const archiveStream = new PassThrough();
    provider.downloadToStream(backup.filePath, archiveStream)
      .catch(err => archiveStream.destroy(err));

    await prisma.backupStepLog.create({ 
      data: { backupId, step: "extract_started", status: "running" } 
    });

    await extractTarGzStream(archiveStream, destination);

    await prisma.backupStepLog.create({ 
      data: { backupId, step: "restore_finished", status: "success" } 
    });
    eventBus.emit("backup.restore.success", { backupId });

    return { success: true };
  } catch (err) {
    console.error("[restoreRunner] Error:", err);
    await prisma.backupStepLog.create({ 
      data: { backupId, step: "restore_failed", status: "error", message: err.message } 
    });
    eventBus.emit("backup.restore.failed", { backupId, error: err.message });
    throw err;
  }
}

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
        writeStream.on("error", reject);
      }
    });

    extract.on("finish", resolve);
    extract.on("error", reject);

    stream.pipe(zlib.createGunzip()).pipe(extract).on("error", reject);
  });
}

module.exports = { performRestoreJob };