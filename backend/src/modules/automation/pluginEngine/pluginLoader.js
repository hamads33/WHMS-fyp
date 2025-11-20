/**
 * src/modules/automation/pluginEngine/pluginLoader.js
 *
 * Upgraded, permissive plugin loader (Option B).
 *
 * - Loads built-in JS actions (src/modules/automation/actions/*.js)
 * - Loads user plugins from <project-root>/plugins/actions/<pluginId>/
 * - Reads manifest.json (if present) and signature.sha256 (optional)
 * - Verifies signature when present (PERMISSIVE mode: accept unsigned plugins)
 * - Registers plugin into in-memory registry (tries multiple register API names for compatibility)
 * - Syncs basic plugin metadata to DB via prisma.plugin.upsert (only safe fields)
 * - Emits audit events through ../utils/audit
 *
 * Notes:
 * - This file is defensive: it won't throw if DB fields differ from schema (it only upserts known fields).
 * - It does NOT write plugin.path or plugin.trusted into the DB to avoid Prisma schema mismatch.
 * - It attempts to call registry.clear() / registry.reset() if available to support different registry implementations.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const prisma = require("../../../lib/prisma");
const registry = require("./pluginRegistry");
const audit = require("../utils/audit");

const BUILTIN_DIR = path.join(__dirname, "..", "actions");
const USER_PLUGINS_DIR = path.join(process.cwd(), "plugins", "actions");

// Permissive mode (Option B): allow unsigned plugins, but verify if signature exists.
const STRICT_SIGNATURE = false;

/**
 * Utility: compute sha256 hex of a file buffer/string
 */
function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Safe registry register wrapper - supports various registry APIs
 */
function safeRegister(plugin) {
  // try common register functions in order
  if (!plugin || !plugin.id) return;

  try {
    if (typeof registry.register === "function") {
      registry.register(plugin);
      return;
    }
    if (typeof registry.registerPlugin === "function") {
      registry.registerPlugin(plugin);
      return;
    }
    if (typeof registry.registerAction === "function") {
      registry.registerAction(plugin);
      return;
    }
    // fallback: if registry is a plain object with 'actions' map
    if (registry && typeof registry === "object" && registry.actions && typeof registry.actions === "object") {
      registry.actions[plugin.id] = plugin;
      return;
    }
    console.warn("[PluginLoader] No compatible registry.register method found. Plugin not registered in-memory:", plugin.id);
  } catch (err) {
    console.error("[PluginLoader] Failed to register plugin in registry:", plugin.id, err);
  }
}

/**
 * Safe registry clear wrapper
 */
function safeClearRegistry() {
  try {
    if (typeof registry.clear === "function") return registry.clear();
    if (typeof registry.reset === "function") return registry.reset();
    // if registry has actions object, clear it
    if (registry && typeof registry === "object" && registry.actions && typeof registry.actions === "object") {
      Object.keys(registry.actions).forEach(k => delete registry.actions[k]);
      return;
    }
    // fallback: try plugins map
    if (registry && registry.plugins && typeof registry.plugins === "object") {
      Object.keys(registry.plugins).forEach(k => delete registry.plugins[k]);
    }
  } catch (err) {
    console.warn("[PluginLoader] safeClearRegistry failed:", err.message);
  }
}

/**
 * Load and validate a single plugin module (either built-in .js file or a user plugin folder)
 *
 * @param {string} modulePath - absolute path to index.js (or builtin .js)
 * @param {string|null} manifestPath - absolute path to manifest.json if present
 * @param {string} source - 'builtin' | 'user' | 'marketplace'
 */
async function loadPluginModule(modulePath, manifestPath = null, source = "user") {
  if (!fs.existsSync(modulePath)) {
    return null;
  }

  // Hot reload (allow replacing)
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch (e) {
    // ignore
  }

  let manifest = {};
  if (manifestPath && fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (err) {
      console.error("[PluginLoader] Invalid manifest.json at", manifestPath, err.message);
      await audit.logSystem("plugin.manifest_invalid", { path: manifestPath, error: err.message });
      return null;
    }
  }

  // Load module
  let mod;
  try {
    mod = require(modulePath);
  } catch (err) {
    console.error("[PluginLoader] Failed to require module:", modulePath, err && err.message);
    await audit.logSystem("plugin.load_error", { path: modulePath, error: err && err.message });
    return null;
  }

  // Build plugin descriptor
  const plugin = {
    id: manifest.id || mod.id || path.basename(modulePath, path.extname(modulePath)),
    name: manifest.name || mod.name || path.basename(modulePath, path.extname(modulePath)),
    version: manifest.version || mod.version || "1.0.0",
    description: manifest.description || mod.description || "",
    jsonSchema: manifest.jsonSchema || mod.jsonSchema || manifest.schema || mod.schema || null,
    execute: mod.execute,
    test: mod.test || (mod.execute ? async (params) => mod.execute({ test: true }, params) : undefined),
    source,
    path: modulePath,
    manifestPath,
    trusted: false,
    signature: null,
    entry: modulePath
  };

  // minimal validation
  if (!plugin.execute || typeof plugin.execute !== "function") {
    console.warn(`[PluginLoader] Plugin ${plugin.id} has no execute() function, skipping`);
    await audit.logSystem("plugin.invalid_no_execute", { pluginId: plugin.id, path: modulePath });
    return null;
  }

  // Signature handling (permissive)
  try {
    const pluginDir = path.dirname(modulePath);
    const sigPathCandidates = [
      path.join(pluginDir, "signature.sha256"),
      path.join(pluginDir, "signature.txt"),
      path.join(pluginDir, `${plugin.id}.sha256`)
    ];

    let sigFile = null;
    for (const c of sigPathCandidates) {
      if (fs.existsSync(c)) {
        sigFile = c;
        break;
      }
    }

    if (sigFile) {
      const sigRaw = fs.readFileSync(sigFile, "utf8").trim();
      // support format: "<hex>" or "sha256:<hex>" or "<hex>  filename"
      const match = sigRaw.match(/([a-f0-9]{64})/i);
      const sigHex = match ? match[1].toLowerCase() : sigRaw.split(/\s+/)[0].toLowerCase();

      // compute hash of index.js content
      const idxContent = fs.readFileSync(modulePath);
      const computed = sha256Hex(idxContent);

      plugin.signature = sigHex;

      if (computed === sigHex) {
        plugin.trusted = true;
        await audit.logSystem("plugin.signature_valid", { pluginId: plugin.id, source, path: modulePath });
      } else {
        plugin.trusted = false;
        await audit.logSystem("plugin.signature_mismatch", { pluginId: plugin.id, source, path: modulePath, expected: sigHex, actual: computed });
        console.warn(`[PluginLoader] Signature mismatch for plugin ${plugin.id} (expected ${sigHex}, got ${computed})`);
        if (STRICT_SIGNATURE) {
          // in strict mode we'd reject; in permissive we keep but mark untrusted
          console.warn(`[PluginLoader] STRICT_SIGNATURE enabled - rejecting plugin ${plugin.id}`);
          return null;
        }
      }
    } else {
      // no signature file
      plugin.trusted = source === "builtin"; // builtin are implicitly trusted
      await audit.logSystem("plugin.unsigned_loaded", { pluginId: plugin.id, source, path: modulePath });
    }
  } catch (err) {
    console.warn("[PluginLoader] Signature verification failed for", plugin.id, err.message);
    // keep plugin but mark untrusted
    plugin.trusted = false;
    await audit.logSystem("plugin.signature_error", { pluginId: plugin.id, error: err.message });
  }

  // Register in-memory
  try {
    safeRegister(plugin);
  } catch (err) {
    console.error("[PluginLoader] Failed to register plugin in-memory:", plugin.id, err.message);
  }

  // Sync to DB (only safe fields to avoid Prisma schema mismatch)
  try {
    // Only upsert fields we are confident exist in schema: id, name, version, source, enabled
    await prisma.plugin.upsert({
      where: { id: plugin.id },
      create: {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        source: plugin.source || "user",
        enabled: true
      },
      update: {
        name: plugin.name,
        version: plugin.version,
        source: plugin.source || "user"
      }
    });

    await audit.logPlugin(plugin.id, "plugin.loaded", { source: plugin.source, trusted: !!plugin.trusted, version: plugin.version, path: plugin.path });
  } catch (err) {
    // Don't crash the loader if DB upsert fails. Log and audit.
    console.warn("[PluginLoader] prisma upsert failed for plugin", plugin.id, err.message);
    try {
      await audit.logSystem("plugin.db_sync_failed", { pluginId: plugin.id, error: err.message });
    } catch (e) { /** swallow */ }
  }

  console.log(`[PluginLoader] Loaded Plugin: ${plugin.id} (${source}) trusted=${plugin.trusted ? "yes" : "no"}`);

  return plugin;
}

/**
 * Load all plugins from provided folder (either built-in folder with .js files
 * or user plugins folder where each plugin is a directory containing manifest.json + index.js)
 */
async function loadFolder(dirPath, sourceType = "user") {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    try {
      const full = path.join(dirPath, entry.name);

      // Built-in single-file action (e.g. create_invoice.js)
      if (entry.isFile() && entry.name.endsWith(".js") && sourceType === "builtin") {
        await loadPluginModule(full, null, sourceType);
        continue;
      }

      // User plugin directory (expects manifest.json + index.js)
      if (entry.isDirectory()) {
        const manifestPath = path.join(full, "manifest.json");
        const indexPath = path.join(full, "index.js");

        // Some user plugins may place code in main.js or action.js — try fallback names
        let modulePath = indexPath;
        if (!fs.existsSync(indexPath)) {
          const altCandidates = ["main.js", "action.js", `${entry.name}.js`].map(n => path.join(full, n));
          const found = altCandidates.find(p => fs.existsSync(p));
          if (found) modulePath = found;
        }

        if (!fs.existsSync(modulePath)) {
          console.warn(`[PluginLoader] Skipping plugin folder ${entry.name}; no index/main/action file found`);
          await audit.logSystem("plugin.skip_no_entry", { folder: full });
          continue;
        }

        await loadPluginModule(modulePath, fs.existsSync(manifestPath) ? manifestPath : null, sourceType);
      }
    } catch (err) {
      console.error("[PluginLoader] Error loading entry", entry && entry.name, err && err.message);
      try {
        await audit.logSystem("plugin.load_entry_error", { entry: entry && entry.name, error: err.message });
      } catch (e) { /** swallow */ }
    }
  }
}

/**
 * Core loader
 */
async function loadPlugins() {
  // Clear registry first (hot-reload friendly)
  safeClearRegistry();

  console.log("== Loading Built-In Plugins ==");
  try {
    await loadFolder(BUILTIN_DIR, "builtin");
  } catch (err) {
    console.error("[PluginLoader] Failed loading builtin plugins:", err && err.message);
  }

  console.log("== Loading User Plugins ==");
  try {
    await loadFolder(USER_PLUGINS_DIR, "user");
  } catch (err) {
    console.error("[PluginLoader] Failed loading user plugins:", err && err.message);
  }

  console.log("== Plugin Engine Ready ==");
  try {
    await audit.logSystem("pluginengine.ready", { builtinDir: BUILTIN_DIR, userDir: USER_PLUGINS_DIR });
  } catch (e) { /* swallow */ }
}

/**
 * Backwards-compatible alias expected by some older modules
 */
async function loadAll() {
  return loadPlugins();
}

module.exports = {
  loadPlugins,
  loadAll,
  // expose internal constants for other modules if needed
  BUILTIN_DIR,
  USER_PLUGINS_DIR,
  sha256Hex
};
