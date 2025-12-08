// src/modules/marketplace/services/storage.service.js
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const PLUGIN_ACTIONS_ROOT = process.env.PLUGIN_ACTIONS_ROOT || "C:\\Fyp\\backend\\plugins\\actions";

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Save uploaded zip buffer (from multer file) to destination path
 * returns absolute path to saved zip
 */
async function saveUploadedArchive({ productId, versionId, file /* multer file object */ }) {
  const destDir = path.join(PLUGIN_ACTIONS_ROOT, productId, versionId);
  ensureDirSync(destDir);

  const destPath = path.join(destDir, 'plugin.zip');

  // multer gives us file.path if storage was disk, or buffer if memoryStorage.
  if (file.path) {
    // move
    await fs.promises.rename(file.path, destPath);
  } else if (file.buffer) {
    await fs.promises.writeFile(destPath, file.buffer);
  } else {
    throw new Error('Unsupported multer file object: missing buffer/path');
  }

  return destPath;
}

/**
 * Read manifest.json from zip without fully extracting.
 * Returns parsed JSON or throws.
 */
async function readManifestFromZip(zipPath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(zipPath)
      .pipe(unzipper.Parse({ forceStream: true }));

    let found = false;
    stream.on('entry', async (entry) => {
      const entryPath = entry.path.replace(/\\/g, '/'); // normalize
      if (entryPath === 'manifest.json' || entryPath.endsWith('/manifest.json')) {
        found = true;
        let json = '';
        entry.on('data', (d) => (json += d.toString()));
        entry.on('end', () => {
          try {
            const parsed = JSON.parse(json);
            resolve(parsed);
          } catch (err) {
            reject(new Error('Invalid manifest.json JSON: ' + err.message));
          }
        });
      } else {
        // drain
        entry.autodrain();
      }
    });

    stream.on('close', () => {
      if (!found) reject(new Error('manifest.json not found inside archive'));
    });

    stream.on('error', (err) => reject(err));
  });
}

module.exports = {
  saveUploadedArchive,
  readManifestFromZip,
  PLUGIN_ACTIONS_ROOT,
};
