// src/modules/plugins/index.js

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

  logger.info("🔌 Initializing Plugin Module...");

  const pluginsDir = path.join(process.cwd(), "plugins", "actions");

  // --------------------------------------------------
  // Loader
  // --------------------------------------------------
  const loader = new PluginLoader({
    pluginsDir,
    logger,
    ajv,
    registry,
    publicKeyPem
  });

  // Initial load
  const plugins = await loader.loadAll();

  // --------------------------------------------------
  // Executors
  // --------------------------------------------------
  const vmExecutor = new VMExecutor({ logger });
  const wasmExecutor = new WASMExecutor({ logger });

  // --------------------------------------------------
  // Routes
  // --------------------------------------------------
  const router = pluginsRoutes({
    logger,
    ajv,
    publicKeyPem,
    prisma,
    loader,
    registry,
    app
  });

  app.use("/api/plugins", router);
  app.use("/plugins/ui", pluginUIRoutes({ logger }));

  // --------------------------------------------------
  // Engine helpers
  // --------------------------------------------------
  function getAction(pluginId, actionName) {
    return registry.getAction(pluginId, actionName);
  }

  /**
   * Action executor with DISABLE ENFORCEMENT
   * 🔥 FIXED: uses ctx instead of meta
   */
 async function runAction(pluginId, actionName, meta = {}) {
  const action = registry.getAction(pluginId, actionName);
  if (!action) {
    throw new Error(`Plugin action not found: ${pluginId}::${actionName}`);
  }

  const pluginDir = path.join(pluginsDir, pluginId);

  const ctx = {
    app,          // ✅ FIX
    prisma,
    logger,
    registry,
    pluginId,
    actionName,
    meta
  };

  const isWasm =
    action.runtime === "wasm" ||
    action.type === "wasm" ||
    (action.file && action.file.endsWith(".wasm"));

  if (isWasm) {
    return wasmExecutor.run({
      pluginId,
      pluginDir,
      wasmFile: action.file,
      exportName: action.export || "run",
      ctx
    });
  }

  return vmExecutor.run({
    pluginId,
    pluginDir,
    actionFile: action.file,
    fnName: action.fnName || "run",
    ctx
  });
}

  /**
   * Reload all plugins and refresh engine state
   */
  async function reload() {
    logger.info("PluginModule: reload requested");
    const loaded = await loader.loadAll();
    engine.plugins = loaded;
    logger.info(
      `PluginModule: reload finished — ${Object.keys(loaded || {}).length} plugins loaded`
    );
    return loaded;
  }

  // --------------------------------------------------
  // Engine object (shared everywhere)
  // --------------------------------------------------
  const engine = {
    loader,
    registry,
    vmExecutor,
    wasmExecutor,
    plugins,
    getAction,
    runAction,
    reload
  };

  // Expose engine globally
  app.locals.pluginEngine = engine;

  logger.info("✅ Plugin Module Ready");

  return engine;
};
