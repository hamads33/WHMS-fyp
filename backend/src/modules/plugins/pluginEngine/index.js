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

  // Load plugins
  const loader = new PluginLoader({
    pluginsDir,
    logger,
    ajv,
    registry,
    publicKeyPem
  });

  const plugins = await loader.loadAll();
  const vmExecutor = new VMExecutor({ logger });
  const wasmExecutor = new WASMExecutor({ logger });

  // API routes
  const router = pluginsRoutes({
    logger,
    ajv,
    publicKeyPem,
    prisma,
    loader,
    registry
  });

  app.use("/api/plugins", router);
  app.use("/plugins/ui", pluginUIRoutes({ logger }));

  //---------------------------------------------------------
  // REQUIRED ENGINE API FOR AUTOMATION + MARKETPLACE
  //---------------------------------------------------------

  function getAction(pluginId, actionName) {
    return registry.getAction(pluginId, actionName);
  }
async function runAction(pluginId, actionName, meta = {}) {
  const action = registry.getAction(pluginId, actionName);
  if (!action) {
    throw new Error(`Plugin action not found: ${pluginId}::${actionName}`);
  }

  const pluginDir = path.join(pluginsDir, pluginId);

  const ctx = {
    meta,
    prisma,
    logger,
    app,
    registry,
    pluginId,
    actionName
  };

  //----------------------------------------------
  // Detect WASM
  //----------------------------------------------
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

  //----------------------------------------------
  // JS PLUGIN ACTION
  //----------------------------------------------
  return await vmExecutor.run({
    pluginId,
    pluginDir,
    actionFile: action.file,
    fnName: action.fnName || "run",
    ctx
  });
}



  //----------------------------------------------
  // Expose public engine interface
  //----------------------------------------------
  app.locals.pluginEngine = {
    loader,
    registry,
    vmExecutor,
    wasmExecutor,
    plugins,
    getAction,
    runAction
  };

  logger.info("✅ Plugin Module Ready");

  return {
    loader,
    registry,
    vmExecutor,
    wasmExecutor,
    plugins,
    getAction,
    runAction
  };
};
