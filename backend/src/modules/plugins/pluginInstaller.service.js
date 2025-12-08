// src/modules/plugins/pluginInstaller.service.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/**
 * PluginInstallerService
 *
 * Responsibilities:
 * - Extract a provided ZIP archive (archivePath) into the plugin actions folder
 * - Or move an already-extracted folder into the plugin actions folder
 * - Validate basic manifest.json presence
 *
 * NOTE: This service is intentionally simple and synchronous where possible.
 * It expects the calling usecase to run it in an async flow (e.g. worker).
 */
const PluginInstallerService = {
  /**
   * Install from a zip archive path.
   * @param {Object} opts
   * @param {String} opts.archivePath - full path to .zip file
   * @param {String} opts.productId
   * @param {String} opts.version
   * @param {String} [opts.destBase] - optional base path override (default: src/modules/plugins/actions)
   * @returns {Promise<{installedPath, manifest}>}
   */
  installFromArchive: async function ({ archivePath, productId, version, destBase } = {}) {
    if (!archivePath) throw new Error("installFromArchive: archivePath is required");
    if (!productId) throw new Error("installFromArchive: productId is required");
    if (!version) throw new Error("installFromArchive: version is required");

    const base = destBase || path.join(__dirname, 'actions');
    const dest = path.join(base, String(productId), String(version));

    ensureDirSync(dest);

    // Try to use adm-zip for extraction (fast). If not installed, give clear error.
    let AdmZip;
    try {
      AdmZip = require('adm-zip');
    } catch (e) {
      throw new Error(
        "PluginInstallerService: please install dependency `adm-zip` (npm i adm-zip) or implement an alternative extractor."
      );
    }

    try {
      const zip = new AdmZip(archivePath);
      zip.extractAllTo(dest, true);
    } catch (err) {
      throw new Error("PluginInstallerService: extraction failed: " + err.message);
    }

    // Basic validation — manifest.json must exist at root of extracted folder
    const manifestPath = path.join(dest, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      // try to discover manifest if zip had a top-level folder
      const entries = fs.readdirSync(dest);
      if (entries.length === 1) {
        const candidate = path.join(dest, entries[0], 'manifest.json');
        if (fs.existsSync(candidate)) {
          // move files up one level
          const tmpDir = path.join(base, `${productId}.${version}.tmp`);
          ensureDirSync(tmpDir);
          // move folder contents to dest root
          const sourceDir = path.join(dest, entries[0]);
          // Move recursively
          const moveRec = (src, dst) => {
            ensureDirSync(dst);
            for (const name of fs.readdirSync(src)) {
              const s = path.join(src, name);
              const d = path.join(dst, name);
              fs.renameSync(s, d);
            }
          };
          moveRec(sourceDir, dest);
          // cleanup empty folder
          try { fs.rmdirSync(sourceDir); } catch (e) {}
        }
      }
    }

    if (!fs.existsSync(manifestPath)) {
      throw new Error("PluginInstallerService: manifest.json not found after extraction");
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    return { installedPath: dest, manifest };
  },

  /**
   * Install from an already-extracted folder (move or copy)
   * @param {Object} opts
   * @param {String} opts.extractedPath - full path to extracted plugin folder
   * @param {String} opts.productId
   * @param {String} opts.version
   * @param {String} [opts.destBase]
   * @returns {Promise<{installedPath, manifest}>}
   */
  installFromFolder: async function ({ extractedPath, productId, version, destBase } = {}) {
    if (!extractedPath) throw new Error("installFromFolder: extractedPath is required");
    if (!productId) throw new Error("installFromFolder: productId is required");
    if (!version) throw new Error("installFromFolder: version is required");

    const base = destBase || path.join(__dirname, 'actions');
    const dest = path.join(base, String(productId), String(version));

    // create destination and copy/move contents
    ensureDirSync(dest);

    // If extractedPath is same as dest, just validate
    if (path.resolve(extractedPath) === path.resolve(dest)) {
      const manifestPath = path.join(dest, 'manifest.json');
      if (!fs.existsSync(manifestPath)) throw new Error("installFromFolder: manifest.json missing in destination");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return { installedPath: dest, manifest };
    }

    // Try to move by renaming (cheap), fallback to recursive copy
    try {
      // attempt rename into parent dest folder (may fail across devices)
      const tempParent = path.dirname(dest);
      ensureDirSync(tempParent);
      // If extractedPath contains a top-level folder, move that folder contents
      const entries = fs.readdirSync(extractedPath);
      if (entries.length === 1) {
        const inner = path.join(extractedPath, entries[0]);
        try {
          fs.renameSync(inner, dest);
        } catch (e) {
          // fallback copy
          copyRecursiveSync(inner, dest);
        }
      } else {
        try {
          fs.renameSync(extractedPath, dest);
        } catch (e) {
          copyRecursiveSync(extractedPath, dest);
        }
      }
    } catch (err) {
      // fallback recursive copy function
      copyRecursiveSync(extractedPath, dest);
    }

    function copyRecursiveSync(src, destPath) {
      ensureDirSync(destPath);
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const dstPath = path.join(destPath, entry.name);
        if (entry.isDirectory()) copyRecursiveSync(srcPath, dstPath);
        else fs.copyFileSync(srcPath, dstPath);
      }
    }

    const manifestPath = path.join(dest, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error("PluginInstallerService: manifest.json missing after installFromFolder");
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return { installedPath: dest, manifest };
  },

  /**
   * Optional helper: run a shell command inside the plugin folder (e.g., for custom install steps)
   * returns { code, stdout, stderr }
   */
  runCommandInFolder: function (folder, cmd, args = [], opts = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, {
        cwd: folder,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: Object.assign({}, process.env, opts.env || {}),
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', d => (stdout += d.toString()));
      child.stderr.on('data', d => (stderr += d.toString()));

      child.on('error', (err) => reject(err));
      child.on('close', (code) => resolve({ code, stdout, stderr }));
    });
  }
};

module.exports = PluginInstallerService;
