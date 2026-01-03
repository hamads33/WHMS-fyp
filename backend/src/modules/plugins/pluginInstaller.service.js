// src/modules/plugins/services/pluginInstaller.service.js
// Secure plugin installer with proper validation and engine reload

const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const ManifestValidator = require("./manifestValidator.service");
const MetadataRegistry = require("./metadataRegistry.service");

function ensureDirSync(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

function removeDirSync(p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
  }
}

function resolvePluginDest(pluginId, base) {
  return path.join(
    base || path.join(process.cwd(), "plugins", "actions"),
    String(pluginId)
  );
}

const PluginInstallerService = {
  /**
   * Install plugin from uploaded ZIP with validation
   */
  async installFromArchive({
    archivePath,
    productId,
    version,
    submissionId,
    destBase
  } = {}) {
    if (!archivePath) throw new Error("archivePath is required");
    if (!productId) throw new Error("productId is required");

    const base = destBase || path.join(process.cwd(), "plugins", "actions");
    const dest = resolvePluginDest(productId, base);

    this._log(submissionId, productId, "info", "extract", `Extracting to ${dest}`);

    // Clean destination in production
    if (process.env.NODE_ENV === "production") {
      removeDirSync(dest);
    }
    ensureDirSync(dest);

    // Extract ZIP
    try {
      const zip = new AdmZip(archivePath);
      zip.extractAllTo(dest, true);
    } catch (err) {
      this._log(submissionId, productId, "error", "extract", err.message);
      throw new Error("ZIP extraction failed: " + err.message);
    }

    // Find and validate manifest
    const manifestPath = await this._detectManifest(dest);
    if (!manifestPath) {
      this._log(submissionId, productId, "error", "manifest", "manifest.json missing");
      throw new Error("manifest.json missing in plugin");
    }

    let manifestJson;
    try {
      manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (err) {
      this._log(submissionId, productId, "error", "manifest", "Invalid JSON");
      throw new Error("Invalid manifest JSON: " + err.message);
    }

    // Validate manifest
    const validation = ManifestValidator.validate(manifestJson);
    if (!validation.valid) {
      this._log(
        submissionId,
        productId,
        "error",
        "validate",
        "Manifest invalid",
        validation.errors
      );
      throw new Error("Manifest validation failed");
    }

    this._log(submissionId, productId, "info", "validate", "Manifest validated");

    // Register metadata
    try {
      MetadataRegistry.register(productId, manifestJson);
    } catch (e) {
      this._log(submissionId, productId, "warn", "metadata", "Registration failed: " + e.message);
    }

    // Reload plugin engine
    await this._reloadEngine(submissionId, productId);

    return { manifest: manifestJson, installedPath: dest };
  },

  /**
   * Install plugin from folder
   */
  async installFromFolder({
    folderPath,
    productId,
    version,
    destBase
  } = {}) {
    if (!folderPath) throw new Error("folderPath is required");
    if (!productId) throw new Error("productId is required");

    const base = destBase || path.join(process.cwd(), "plugins", "actions");
    const dest = resolvePluginDest(productId, base);

    // Clean destination in production
    if (process.env.NODE_ENV === "production") {
      removeDirSync(dest);
    }
    ensureDirSync(dest);

    // Copy folder
    this._copyRecursive(folderPath, dest);

    // Validate manifest
    const manifestPath = path.join(dest, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      throw new Error("manifest.json missing");
    }

    let manifestJson;
    try {
      manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (err) {
      throw new Error("Invalid manifest JSON: " + err.message);
    }

    const validation = ManifestValidator.validate(manifestJson);
    if (!validation.valid) {
      throw new Error(
        "Manifest validation failed: " + JSON.stringify(validation.errors)
      );
    }

    // Register metadata
    MetadataRegistry.register(productId, manifestJson);

    // Reload engine
    await this._reloadEngine(null, productId);

    return {
      ok: true,
      installedPath: dest,
      manifest: manifestJson
    };
  },

  /**
   * Detect manifest.json location
   */
  async _detectManifest(dest) {
    const direct = path.join(dest, "manifest.json");
    if (fs.existsSync(direct)) return direct;

    // Check for nested folder structure
    const entries = fs.readdirSync(dest);
    if (entries.length === 1) {
      const entry = entries[0];
      const entryPath = path.join(dest, entry);
      
      if (fs.lstatSync(entryPath).isDirectory()) {
        const nestedManifest = path.join(entryPath, "manifest.json");
        
        if (fs.existsSync(nestedManifest)) {
          // Flatten structure
          const items = fs.readdirSync(entryPath);
          for (const item of items) {
            const src = path.join(entryPath, item);
            const dst = path.join(dest, item);
            fs.renameSync(src, dst);
          }
          
          // Remove empty folder
          fs.rmSync(entryPath, { recursive: true, force: true });
          
          return path.join(dest, "manifest.json");
        }
      }
    }

    return null;
  },

  /**
   * Copy directory recursively
   */
  _copyRecursive(src, dst) {
    if (!fs.existsSync(dst)) {
      fs.mkdirSync(dst, { recursive: true });
    }

    const entries = fs.readdirSync(src);
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const dstPath = path.join(dst, entry);
      
      if (fs.lstatSync(srcPath).isDirectory()) {
        this._copyRecursive(srcPath, dstPath);
      } else {
        fs.copyFileSync(srcPath, dstPath);
      }
    }
  },

  /**
   * Reload plugin engine safely
   */
  async _reloadEngine(submissionId, productId) {
    try {
      // Try multiple engine references
      const engine =
        global.__app?.locals?.pluginEngine ||
        (global.app?.locals?.pluginEngine) ||
        null;

      if (!engine) {
        this._log(submissionId, productId, "warn", "engine", "Engine not available");
        return;
      }

      if (typeof engine.reload === "function") {
        await engine.reload();
        this._log(submissionId, productId, "info", "engine", "Engine reloaded");
      } else if (engine.loader && typeof engine.loader.loadAll === "function") {
        const plugins = await engine.loader.loadAll();
        engine.plugins = plugins;
        this._log(submissionId, productId, "info", "engine", "Engine reloaded via loader");
      } else {
        this._log(submissionId, productId, "warn", "engine", "No reload method found");
      }
    } catch (e) {
      this._log(submissionId, productId, "error", "engine", "Reload failed: " + e.message);
      throw e;
    }
  },

  /**
   * Log helper (hooks into BuildLogStore if available)
   */
  _log(submissionId, productId, level, step, message, meta = null) {
    try {
      const BuildLogStore = require("../../marketplace/stores/buildLogStore");
      BuildLogStore.log({
        submissionId,
        productId,
        level,
        step,
        message,
        meta
      });
    } catch (e) {
      // BuildLogStore not available, use console
      console.log(`[${level}] [${step}] ${message}`);
    }
  }
};

module.exports = PluginInstallerService;