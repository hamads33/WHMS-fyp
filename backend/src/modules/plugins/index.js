// src/modules/plugins/index.js
// FIXED: Added reload() method and proper engine initialization

const path = require("path");
const PluginLoader = require("./pluginEngine/loader");
const registry = require("./pluginEngine/registry");

const VMExecutor = require("./pluginEngine/vmExecutor");
const WASMExecutor = require("./pluginEngine/wasmExecutor");

const pluginsRoutes = require("./routes/plugins.routes");
const pluginUIRoutes = require("./routes/pluginUI.routes");

module.exports = async function initPluginModule({
  app,
  prisma,
  logger,
  ajv,
  publicKeyPem
}) {
  if (!app) throw new Error("initPluginModule requires { app }");
  if (!logger) logger = console;

  logger.info("🔌 Initializing Plugin Module...");

  const pluginsDir = path.join(process.cwd(), "plugins", "actions");

  // Load plugins
  const loader = new PluginLoader({
    pluginsDir,
    logger,
    ajv,
    registry,
    publicKeyPem,
    app
  });

  let plugins = await loader.loadAll();
  const vmExecutor = new VMExecutor({ logger });
  const wasmExecutor = new WASMExecutor({ logger });

  // Helper: Get action from registry
  function getAction(pluginId, actionName) {
    return registry.getAction(pluginId, actionName);
  }

  // Helper: Run action with proper context
  async function runAction(pluginId, actionName, meta = {}) {
    const action = registry.getAction(pluginId, actionName);
    if (!action) {
      throw new Error(`Plugin action not found: ${pluginId}::${actionName}`);
    }

    // Check if plugin is disabled
    const plugin = registry.get(pluginId);
    if (plugin && plugin.enabled === false) {
      const err = new Error("plugin_disabled");
      err.code = "PLUGIN_DISABLED";
      throw err;
    }

    const pluginDir = path.join(pluginsDir, pluginId);

    const ctx = {
      meta: meta || {},
      prisma,
      logger,
      app,
      registry,
      pluginId,
      actionName
    };

    // Detect WASM vs JS
    const isWasm =
      action.runtime === "wasm" ||
      action.type === "wasm" ||
      (action.file && action.file.endsWith(".wasm"));

    if (isWasm) {
      return await wasmExecutor.run({
        pluginId,
        pluginDir,
        wasmFile: action.file,
        exportName: action.export || "run",
        ctx
      });
    }

    // Default: JS action
    return await vmExecutor.run({
      pluginId,
      pluginDir,
      actionFile: action.file,
      fnName: action.fnName || "run",
      ctx
    });
  }

  // ✅ FIXED: Add reload method
  async function reload() {
    logger.info("🔄 PluginEngine: reloading all plugins...");
    try {
      const reloadedPlugins = await loader.loadAll();
      
      // Update engine state - atomic replacement
      Object.keys(plugins).forEach(k => delete plugins[k]);
      Object.assign(plugins, reloadedPlugins);
      
      logger.info(`✅ PluginEngine: reload complete (${Object.keys(plugins).length} plugins)`);
      return { 
        success: true, 
        pluginCount: Object.keys(plugins).length 
      };
    } catch (err) {
      logger.error("❌ PluginEngine: reload failed:", err.message);
      throw err;
    }
  }

  // Setup routes
  const router = pluginsRoutes({
    logger,
    ajv,
    publicKeyPem,
    prisma,
    loader,
    registry,
    engine: { reload, registry, runAction }
  });

  app.use("/api/plugins", router);
  app.use("/plugins/ui", pluginUIRoutes({ logger }));

  // ✅ FIXED: Expose complete engine with reload method
  const engine = {
    loader,
    registry,
    vmExecutor,
    wasmExecutor,
    plugins,
    getAction,
    runAction,
    reload  // ✅ CRITICAL
  };

  app.locals.pluginEngine = engine;

  logger.info("✅ Plugin Module Ready");
  logger.info("   • Plugins: " + Object.keys(plugins).length);
  logger.info("   • API: GET  /api/plugins/list");
  logger.info("   • API: POST /api/plugins/upload");
  logger.info("   • Engine: Reload available");

  return engine;
};