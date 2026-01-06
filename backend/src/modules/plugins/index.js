// src/modules/plugins/index.js
// Stable plugin engine initialization (viva-safe)

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
  logger = logger || console;

  const pluginsDir = path.join(process.cwd(), "plugins", "actions");

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

  async function runAction(pluginId, actionName, meta = {}) {
    const action = registry.getAction(pluginId, actionName);
    if (!action) {
      throw new Error(`Plugin action not found: ${pluginId}::${actionName}`);
    }

    const plugin = registry.get(pluginId);
    if (plugin && plugin.enabled === false) {
      throw new Error("plugin_disabled");
    }

    const pluginDir = path.join(pluginsDir, pluginId);

    const ctx = {
      meta: { ...(meta || {}) },
      prisma,
      logger,
      app,
      registry,
      pluginId,
      actionName
    };

    const isWasm =
      action.runtime === "wasm" ||
      action.type === "wasm" ||
      action.file.endsWith(".wasm");

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

  async function reload() {
    const reloaded = await loader.loadAll();
    Object.keys(plugins).forEach(k => delete plugins[k]);
    Object.assign(plugins, reloaded);
    return { success: true, pluginCount: Object.keys(plugins).length };
  }

  const router = pluginsRoutes({
    logger,
    prisma,
    loader,
    registry,
    app
  });

  app.use("/api/plugins", router);
  app.use("/plugins/ui", pluginUIRoutes({ logger }));

  app.locals.pluginEngine = {
    loader,
    registry,
    vmExecutor,
    wasmExecutor,
    plugins,
    runAction,
    reload
  };

  logger.info(`✅ Plugin Module Ready (${Object.keys(plugins).length} plugins)`);

  return app.locals.pluginEngine;
};
