/**
 * WHMCS Plugin Loader
 * Loads built-in plugins + user-installed plugins from /plugins/actions
 * Syncs plugins with DB
 */
/**
 * WHMCS Plugin Loader
 * Loads built-in plugins + user-installed plugins from /plugins/actions
 * Syncs plugins with DB
 */

const fs = require("fs");
const path = require("path");

// ✅ Correct location of prisma.js based on your folder tree
const prisma = require("../../../lib/prisma");

const registry = require("./pluginRegistry");
const audit = require("../utils/audit");

const BUILTIN_DIR = path.join(__dirname, "..", "actions");
const USER_PLUGINS_DIR = path.join(process.cwd(), "plugins/actions");

/**
 * Load plugins from a directory
 */
async function loadFolder(dirPath, sourceType = "user") {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const full = path.join(dirPath, entry);

    let manifestPath = null;
    let modulePath = null;

    // Built-in plugin = .js file
    if (entry.endsWith(".js")) {
      modulePath = full;
    }
    // User plugin folder structure
    else {
      manifestPath = path.join(full, "manifest.json");
      modulePath = path.join(full, "index.js");
    }

    if (!fs.existsSync(modulePath)) continue;

    // hot reload support
    delete require.cache[require.resolve(modulePath)];

    try {
      let manifest = {};

      if (manifestPath && fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      }

      const mod = require(modulePath);

      const plugin = {
        id: manifest.id || mod.id,
        name: manifest.name || mod.name,
        version: manifest.version || mod.version || "1.0.0",
        description: manifest.description || mod.description || "",
        jsonSchema: manifest.jsonSchema || mod.jsonSchema || {},
        execute: mod.execute,
        test: mod.test || ((params) => mod.execute({ test: true }, params)),
        source: sourceType
      };

      if (!plugin.id) {
        console.error("[PluginLoader] Missing plugin.id in:", entry);
        continue;
      }

      // In-memory registry
      registry.register(plugin);

      // DB Sync
      await prisma.plugin.upsert({
        where: { id: plugin.id },
        create: {
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          source: sourceType,
          enabled: true
        },
        update: {
          name: plugin.name,
          version: plugin.version,
          source: sourceType
        }
      });

      await audit.logSystem("plugin.loaded", {
        id: plugin.id,
        source: sourceType,
        version: plugin.version
      });

      console.log(`[PluginLoader] Loaded Plugin: ${plugin.id} (${sourceType})`);
    } catch (err) {
      console.error(`[PluginLoader] Failed: ${entry}`, err);
    }
  }
}

/**
 * Core loader
 */
async function loadPlugins() {
  registry.clear();

  console.log("== Loading Built-In Plugins ==");
  await loadFolder(BUILTIN_DIR, "builtin");

  console.log("== Loading User Plugins ==");
  await loadFolder(USER_PLUGINS_DIR, "user");

  console.log("== Plugin Engine Ready ==");
}

/**
 * Alias to maintain backward compatibility
 * automation.module.js expects loadAll()
 */
async function loadAll() {
  return loadPlugins();
}

module.exports = {
  loadPlugins,
  loadAll
};
