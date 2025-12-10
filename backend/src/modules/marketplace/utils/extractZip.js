// src/modules/marketplace/utils/extractZip.js
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");

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
    // if extraction fails, cleanup may occur in caller
    return false;
  }
}

module.exports = { extractZipToDir };
