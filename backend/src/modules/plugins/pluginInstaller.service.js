// src/modules/plugins/pluginInstaller.service.js
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const ManifestValidator = require("./manifestValidator.service");
const MetadataRegistry = require("./metadataRegistry.service");
const BuildLogStore = require("../marketplace/stores/buildLogStore");

function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function removeDirSync(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function resolvePluginDest(pluginId, base) {
  return path.join(base || path.join(process.cwd(), "plugins", "actions"), String(pluginId));
}

const PluginInstallerService = {
  /**
   * Install plugin from uploaded ZIP
   */
  async installFromArchive({ archivePath, productId, version, submissionId, destBase } = {}) {
    if (!archivePath) throw new Error("archivePath is required");
    if (!productId) throw new Error("productId is required");

    const base = destBase || path.join(process.cwd(), "plugins", "actions");
    const dest = resolvePluginDest(productId, base);

    await BuildLogStore.log({
      submissionId,
      productId,
      versionId: version,
      level: "info",
      step: "extract",
      message: `Extracting plugin archive to ${dest}`
    });

    if (process.env.NODE_ENV === "production") {
      removeDirSync(dest);
      ensureDirSync(dest);
    } else {
      ensureDirSync(dest);
    }

    try {
      const zip = new AdmZip(archivePath);
      zip.extractAllTo(dest, true);
    } catch (err) {
      await BuildLogStore.log({ submissionId, productId, level: "error", step: "extract", message: err.message });
      throw new Error("ZIP extraction failed: " + err.message);
    }

    const manifestPath = await detectManifest(dest);
    if (!manifestPath) {
      await BuildLogStore.log({ submissionId, productId, level: "error", step: "manifest", message: "manifest.json missing" });
      throw new Error("manifest.json missing in plugin");
    }

    const manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const validation = ManifestValidator.validate(manifestJson);
    if (!validation.valid) {
      await BuildLogStore.log({
        submissionId,
        productId,
        level: "error",
        step: "validate",
        message: "Manifest invalid",
        meta: validation.errors
      });
      throw new Error("Manifest validation failed");
    }

    await BuildLogStore.log({
      submissionId,
      productId,
      level: "info",
      step: "validate",
      message: "Manifest validated successfully"
    });

    // register lightweight metadata (useful for marketplace UI)
    try {
      MetadataRegistry.register(productId, manifestJson);
    } catch (e) {
      await BuildLogStore.log({ submissionId, productId, level: "warn", step: "metadata", message: "metadata register failed: " + (e.message || e) });
    }

    // CRITICAL: reload the shared engine (do NOT instantiate a new PluginLoader)
    try {
      const engine = global.__app?.locals?.pluginEngine || (global.app && global.app.locals && global.app.locals.pluginEngine);
      if (!engine) {
        await BuildLogStore.log({ submissionId, productId, level: "warn", step: "engine", message: "plugin engine not available to reload" });
      } else {
        if (typeof engine.reload === "function") {
          await engine.reload();
        } else if (engine.loader && typeof engine.loader.loadAll === "function") {
          const plugins = await engine.loader.loadAll();
          engine.plugins = plugins;
        }
      }
      await BuildLogStore.log({ submissionId, productId, level: "info", step: "engine", message: "Plugin engine reload attempted" });
    } catch (e) {
      await BuildLogStore.log({ submissionId, productId, level: "error", step: "engine", message: "engine reload failed: " + (e.message || e) });
    }

    return { manifest: manifestJson, installedPath: dest };
  },

  /**
   * Install plugin from a folder (manual developer installation)
   */
  async installFromFolder({ folderPath, productId, version, destBase } = {}) {
    if (!folderPath) throw new Error("folderPath is required");
    if (!productId) throw new Error("productId is required");

    const base = destBase || path.join(process.cwd(), "plugins", "actions");
    const dest = resolvePluginDest(productId, base);

    if (process.env.NODE_ENV === "production") {
      removeDirSync(dest);
      ensureDirSync(dest);
    } else {
      ensureDirSync(dest);
    }

    // copy folder recursively
    copyRecursive(folderPath, dest);

    const manifestPath = path.join(dest, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      throw new Error("installFromFolder: manifest.json missing");
    }

    const manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const validation = ManifestValidator.validate(manifestJson);
    if (!validation.valid) {
      throw new Error("installFromFolder: Manifest validation failed: " + JSON.stringify(validation.errors));
    }

    MetadataRegistry.register(productId, manifestJson);

    // reload shared engine
    try {
      const engine = global.__app?.locals?.pluginEngine || (global.app && global.app.locals && global.app.locals.pluginEngine);
      if (!engine) {
        // warn and continue
      } else {
        if (typeof engine.reload === "function") {
          await engine.reload();
        } else if (engine.loader && typeof engine.loader.loadAll === "function") {
          const plugins = await engine.loader.loadAll();
          engine.plugins = plugins;
        }
      }
    } catch (e) {
      // not fatal
    }

    return {
      ok: true,
      installedPath: dest,
      manifest: manifestJson
    };
  },

  runCommand(folder, cmd, args = []) {
    return new Promise((resolve) => {
      const child = require("child_process").spawn(cmd, args, { cwd: folder, shell: true });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", d => (stdout += d.toString()));
      child.stderr.on("data", d => (stderr += d.toString()));
      child.on("close", code => resolve({ code, stdout, stderr }));
    });
  }
};

/* --------------------------
   Manifest detection + helpers
   -------------------------- */
async function detectManifest(dest) {
  const direct = path.join(dest, "manifest.json");
  if (fs.existsSync(direct)) return direct;

  const entries = fs.readdirSync(dest);
  if (entries.length === 1 && fs.lstatSync(path.join(dest, entries[0])).isDirectory()) {
    const nestedFolder = path.join(dest, entries[0]);
    const nestedManifest = path.join(nestedFolder, "manifest.json");
    if (fs.existsSync(nestedManifest)) {
      // move contents up
      for (const f of fs.readdirSync(nestedFolder)) {
        fs.renameSync(path.join(nestedFolder, f), path.join(dest, f));
      }
      fs.rmSync(nestedFolder, { recursive: true, force: true });
      return path.join(dest, "manifest.json");
    }
  }
  return null;
}

function copyRecursive(src, dst) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dst, item);
    if (fs.lstatSync(s).isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

module.exports = PluginInstallerService;
