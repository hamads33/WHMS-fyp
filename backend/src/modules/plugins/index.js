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

  // Create loader with injected dependencies
  const loader = new PluginLoader({
    pluginsDir,
    logger,
    ajv,
    registry,
    publicKeyPem
  });

  // Load plugins initially
  const plugins = await loader.loadAll();

  // Executors
  const vmExecutor = new VMExecutor({ logger });
  const wasmExecutor = new WASMExecutor({ logger });

  // -----------------------------------------
  // ROUTES
  // -----------------------------------------
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

  // -----------------------------------------
  // ENGINE FUNCTIONS
  // -----------------------------------------

  function getAction(pluginId, actionName) {
    return registry.getAction(pluginId, actionName);
  }

  /**
   * Action executor with DISABLE ENFORCEMENT
   */
  async function runAction(pluginId, actionName, meta = {}) {

    // 🔒 ENFORCE DISABLE STATE
    const pluginMeta = registry.get(pluginId);
    if (pluginMeta && pluginMeta.enabled === false) {
      throw new Error(`Plugin '${pluginId}' is disabled and cannot run actions.`);
    }

    const action = registry.getAction(pluginId, actionName);
    if (!action) {
      throw new Error(`Plugin action not found: ${pluginId}::${actionName}`);
    }

    const pluginDir = path.join(pluginsDir, pluginId);

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
        meta
      });
    }

    return await vmExecutor.run({
      pluginId,
      pluginDir,
      actionFile: action.file,
      fnName: action.fnName || "run",
      meta
    });
  }

  /**
   * Unified engine reload function:
   * - reloads plugins via loader
   * - updates engine.plugins reference
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

  // -----------------------------------------
  // SHARED ENGINE OBJECT
  // -----------------------------------------

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

  // expose engine to the entire app (installers, workers, etc.)
  app.locals.pluginEngine = engine;

  logger.info("✅ Plugin Module Ready");

  return engine;
};
