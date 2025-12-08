// installer.service.js
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

// Recursively find manifest.json inside extracted folder
function findManifestFile(dir) {
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isFile() && e.name.toLowerCase() === "manifest.json") {
        return full;
      }
      if (e.isDirectory()) stack.push(full);
    }
  }
  return null;
}

module.exports = {
  extract: async (zipPath, { productId, basePath }) => {
    try {
      if (!fs.existsSync(zipPath)) {
        return { success: false, error: `zip not found at ${zipPath}` };
      }

      basePath = path.resolve(basePath);
      fs.mkdirSync(basePath, { recursive: true });

      const productFolder = path.join(basePath, productId);
      fs.mkdirSync(productFolder, { recursive: true });

      let zip;
      try {
        zip = new AdmZip(zipPath);
      } catch (err) {
        return { success: false, error: "Invalid zip: " + err.message };
      }

      // Find manifest entry in ANY folder
      let manifestEntry = zip.getEntries().find((e) => {
        return path.posix.basename(e.entryName.toLowerCase()) === "manifest.json";
      });

      if (!manifestEntry) {
        return { success: false, error: "manifest.json missing in archive" };
      }

      // Parse manifest
      let manifest;
      try {
        manifest = JSON.parse(manifestEntry.getData().toString("utf8"));
      } catch (err) {
        return { success: false, error: "Invalid manifest.json: " + err.message };
      }

      const version = manifest.version || Date.now().toString();

      // Extract to base/productId/version
      const extractFolder = path.join(productFolder, version);
      fs.mkdirSync(extractFolder, { recursive: true });

      try {
        zip.extractAllTo(extractFolder, true);
      } catch (err) {
        return { success: false, error: "Extraction failed: " + err.message };
      }

      // After extraction, find actual manifest.json location
      const discoveredManifestPath = findManifestFile(extractFolder);
      if (!discoveredManifestPath) {
        return { success: false, error: "manifest.json missing after extraction" };
      }

      const finalExtractFolder = path.dirname(discoveredManifestPath);

      return {
        success: true,
        version,
        extractFolder: finalExtractFolder,
        manifest,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
