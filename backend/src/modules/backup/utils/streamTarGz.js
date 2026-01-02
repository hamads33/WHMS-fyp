const tar = require("tar-stream");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

async function addDirectory(pack, dirPath, tarPath) {
  const items = await fs.promises.readdir(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = await fs.promises.stat(fullPath);
    const entryName = path.join(tarPath, item);

    if (stat.isDirectory()) {
      pack.entry({ name: entryName + "/", type: "directory", mode: stat.mode });
      await addDirectory(pack, fullPath, entryName);
    } else {
      await new Promise((resolve, reject) => {
        const entry = pack.entry(
          { name: entryName, size: stat.size, mode: stat.mode, mtime: stat.mtime },
          (err) => (err ? reject(err) : resolve())
        );
        fs.createReadStream(fullPath).on("error", reject).pipe(entry);
      });
    }
  }
}

function tarGzFromFilesStream(files = [], dbDumpStreamEntries = []) {
  const pack = tar.pack();

  // FIX: Controlled execution flow ensures the stream doesn't close prematurely
  // AND proper error handling for unhandled promise rejections
  const run = async () => {
    try {
      for (const f of files) {
        const stat = await fs.promises.stat(f);
        const base = path.basename(f);
        if (stat.isDirectory()) {
          await addDirectory(pack, f, base);
        } else {
          await new Promise((resolve, reject) => {
            const entry = pack.entry(
              { name: base, size: stat.size, mode: stat.mode, mtime: stat.mtime },
              (err) => (err ? reject(err) : resolve())
            );
            fs.createReadStream(f).on("error", reject).pipe(entry);
          });
        }
      }

      for (const dbEntry of dbDumpStreamEntries) {
        await new Promise((resolve, reject) => {
          const entry = pack.entry(
            { name: dbEntry.name, type: "file" },
            (err) => (err ? reject(err) : resolve())
          );
          entry.on("finish", resolve);
          dbEntry.stream
            .on("error", (e) => {
              entry.destroy(e);
              reject(e);
            })
            .pipe(entry);
        });
      }
      pack.finalize();
    } catch (err) {
      console.error("[tarGz] Fatal error during archive creation:", err);
      pack.destroy(err);
    }
  };

  // FIX: Added .catch() handler to prevent unhandled promise rejections
  run().catch((err) => {
    console.error("[tarGz] Unhandled error in run():", err);
    pack.destroy(err);
  });

  return pack.pipe(zlib.createGzip({ level: 6 }));
}

module.exports = { tarGzFromFilesStream };