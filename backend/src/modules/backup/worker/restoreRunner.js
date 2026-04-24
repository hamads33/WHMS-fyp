// src/modules/backup/worker/restoreRunner.js

// 🔴 IMPORTANT: Register backup providers in worker process
require("../bootstrap");

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

    // Use provided destination or default to a restore directory
    let { destination, restoreFiles, restoreDb } = payload;

    // Set default restore flags based on backup type
    if (restoreFiles === undefined) {
      restoreFiles = backup.type === "files" || backup.type === "full" || backup.type === "config";
    }
    if (restoreDb === undefined) {
      restoreDb = backup.type === "database" || backup.type === "full";
    }
    
    // Handle null, undefined, or empty string
    if (!destination || typeof destination !== 'string' || destination.trim() === '') {
      // Default destination: ./storage/restores/backup-{id}-{timestamp}
      destination = path.join(
        process.cwd(), 
        "storage", 
        "restores", 
        `backup-${backupId}-${Date.now()}`
      );
      console.log(`[restore] No destination provided, using default: ${destination}`);
    } else {
      // Normalize and validate provided destination
      destination = path.resolve(destination);
      console.log(`[restore] Using provided destination: ${destination}`);
    }

    await prisma.backupStepLog.create({ 
      data: { backupId, step: "restore_started", status: "running" } 
    });
    eventBus.emit("backup.restore.started", { backupId });

    /* ---------------------------------------------------------
       Handle Local provider (null storageConfigId)
    --------------------------------------------------------- */
    let provider;
    if (backup.storageConfigId) {
      const conf = await storageConfigService.decryptAndReturnConfig(backup.storageConfigId);
      if (!conf) {
        throw new Error("Failed to decrypt storage configuration");
      }
      provider = createProviderInstance(conf.provider, conf);
    } else {
      // Fallback to local provider if no config ID exists
      provider = createProviderInstance("local", {});
    }

    await prisma.backupStepLog.create({ 
      data: { backupId, step: "download_started", status: "running" } 
    });

    // Use downloadStream instead of downloadToStream for better compatibility
    const archiveStream = await provider.downloadStream(backup.filePath);

    await prisma.backupStepLog.create({ 
      data: { backupId, step: "extract_started", status: "running" } 
    });

    // Ensure destination directory exists
    await fse.ensureDir(destination);

    await extractTarGzStream(archiveStream, destination, { restoreFiles, restoreDb });

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

async function extractTarGzStream(stream, destination, { restoreFiles = true, restoreDb = true } = {}) {
  return new Promise((resolve, reject) => {
    const extract = tar.extract();

    extract.on("entry", async (header, entryStream, next) => {
      // FIX: Validate header.name exists
      if (!header.name || typeof header.name !== 'string') {
        console.warn(`[restore] Skipping entry with invalid name:`, header);
        entryStream.resume(); // Drain the stream
        next();
        return;
      }

      // Filter entries based on restore flags
      const isDbFile = header.name === "db.sql" || header.name.endsWith("/db.sql");
      if (isDbFile && !restoreDb) {
        console.log(`[restore] Skipping db.sql (restoreDb=false)`);
        entryStream.resume();
        next();
        return;
      }
      if (!isDbFile && !restoreFiles) {
        console.log(`[restore] Skipping file entry (restoreFiles=false): ${header.name}`);
        entryStream.resume();
        next();
        return;
      }

      // FIX: Sanitize the path to prevent path traversal
      const sanitizedName = header.name.replace(/^(\.\.(\/|\\|$))+/, '');
      const destPath = path.join(destination, sanitizedName);

      // FIX: Ensure we're still within the destination directory
      const normalizedDest = path.normalize(destination);
      const normalizedPath = path.normalize(destPath);

      if (!normalizedPath.startsWith(normalizedDest)) {
        console.warn(`[restore] Skipping entry outside destination:`, header.name);
        entryStream.resume();
        next();
        return;
      }

      try {
        if (header.type === "directory") {
          await fse.ensureDir(destPath);
          entryStream.resume();
          next();
        } else if (header.type === "file") {
          await fse.ensureDir(path.dirname(destPath));
          const writeStream = fs.createWriteStream(destPath);
          
          entryStream.pipe(writeStream);
          
          writeStream.on("finish", () => next());
          writeStream.on("error", (err) => {
            console.error(`[restore] Write error for ${destPath}:`, err);
            reject(err);
          });
          entryStream.on("error", (err) => {
            console.error(`[restore] Stream error for ${destPath}:`, err);
            reject(err);
          });
        } else {
          // Skip other types (symlinks, etc.)
          console.log(`[restore] Skipping entry type ${header.type}:`, header.name);
          entryStream.resume();
          next();
        }
      } catch (err) {
        console.error(`[restore] Error processing entry ${header.name}:`, err);
        reject(err);
      }
    });

    extract.on("finish", () => {
      console.log('[restore] Extract finished successfully');
      resolve();
    });
    
    extract.on("error", (err) => {
      console.error('[restore] Extract error:', err);
      reject(err);
    });

    const gunzip = zlib.createGunzip();
    
    gunzip.on("error", (err) => {
      console.error('[restore] Gunzip error:', err);
      reject(err);
    });

    stream
      .pipe(gunzip)
      .pipe(extract)
      .on("error", (err) => {
        console.error('[restore] Pipeline error:', err);
        reject(err);
      });
  });
}

module.exports = { performRestoreJob };