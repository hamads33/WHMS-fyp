// src/modules/backup/utils/streamTarGz.js
const tar = require("tar-stream");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");
const pipe = promisify(pipeline);
const pack = tar.pack();

/**
 * Recursively add directory to tar pack
 * baseSrc: absolute path, baseName: name inside tar
 */
async function addDirectoryToPack(packInstance, baseSrc, baseName) {
  const items = await fs.promises.readdir(baseSrc);
  for (const item of items) {
    const itemPath = path.join(baseSrc, item);
    const stat = await fs.promises.stat(itemPath);
    if (stat.isDirectory()) {
      // create directory entry (some tar consumers want directory entries)
      packInstance.entry({ name: path.join(baseName, item) + "/", mode: stat.mode, type: "directory" }, (err) => {
        if (err) throw err;
      });
      await addDirectoryToPack(packInstance, itemPath, path.join(baseName, item));
    } else if (stat.isFile()) {
      await new Promise((resolve, reject) => {
        const rs = fs.createReadStream(itemPath);
        const entry = packInstance.entry(
          { name: path.join(baseName, item), size: stat.size, mode: stat.mode, mtime: stat.mtime },
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
        rs.pipe(entry);
        rs.on("error", reject);
      });
    } // ignore other types (symlinks, etc.) or handle as needed
  }
}

/**
 * Accepts:
 *  - files: array of absolute paths to files or directories
 *  - dbDumpStreamEntries: optional array of { name: "db.sql.gz", stream: Readable }
 *
 * Returns: Readable (gzip) stream of the tar.gz archive
 */
async function tarGzFromFilesStream(files = [], dbDumpStreamEntries = []) {
  const packInstance = tar.pack();

  (async () => {
    try {
      for (const f of files) {
        const stat = await fs.promises.stat(f);
        if (stat.isDirectory()) {
          await addDirectoryToPack(packInstance, f, path.basename(f));
        } else if (stat.isFile()) {
          await new Promise((resolve, reject) => {
            const rs = fs.createReadStream(f);
            const entry = packInstance.entry(
              { name: path.basename(f), size: stat.size, mode: stat.mode, mtime: stat.mtime },
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            );
            rs.pipe(entry);
            rs.on("error", reject);
          });
        }
      }

      // Add db dump stream entries (like db.sql.gz) by piping stream into entry
      for (const dbEntry of dbDumpStreamEntries) {
        await new Promise((resolve, reject) => {
          const entry = packInstance.entry({ name: dbEntry.name }, (err) => {
            if (err) return reject(err);
            resolve();
          });
          dbEntry.stream.pipe(entry);
          dbEntry.stream.on("error", (e) => {
            entry.destroy(e);
            reject(e);
          });
        });
      }

      packInstance.finalize();
    } catch (err) {
      packInstance.destroy(err);
    }
  })();

  const gzip = zlib.createGzip({ level: 6 });
  return packInstance.pipe(gzip);
}

module.exports = { tarGzFromFilesStream };
