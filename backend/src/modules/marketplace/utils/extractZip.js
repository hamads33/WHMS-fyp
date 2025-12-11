// src/modules/marketplace/utils/extractZip.js
const AdmZip = require("adm-zip");
const fs = require("fs");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function extractZipToDir(zipPath, destDir) {
  try {
    ensureDir(destDir);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destDir, true);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { extractZipToDir };
