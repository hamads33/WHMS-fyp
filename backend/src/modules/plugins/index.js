// src/modules/plugins/index.js
// Fixed and secured plugin module initialization

const path = require("path");
const express = require("express");

const PluginLoader = require("./pluginEngine/loader");
const registry = require("./pluginEngine/registry");
const VMExecutor = require("./pluginEngine/vmExecutor");
const WASMExecutor = require("./pluginEngine/wasmExecutor");

const pluginsRoutes = require("./routes/plugins.routes");
const pluginConfigRoutes = require("./routes/pluginConfig.routes");
const pluginUIRoutes = require("./routes/pluginUI.routes");

// --------------------------------------------------
// Execution lock management
// --------------------------------------------------
const executionLocks = new Map();

function acquireLock(key) {
  executionLocks.set(key, (executionLocks.get(key) || 0) + 1);
}

function releaseLock(key) {
  const current = executionLocks.get(key) || 0;
  if (current > 1) executionLocks.set(key, current - 1);
  else executionLocks.delete(key);
}

function isLocked(key) {
  return executionLocks.has(key);
}

// --------------------------------------------------
// Module init
// --------------------------------------------------
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

  const plugins = await loader.loadAll();

  // --------------------------------------------------
  // Executors
  // --------------------------------------------------
  const vmExecutor = new VMExecutor({ logger });
  const wasmExecutor = new WASMExecutor({ logger });

  // --------------------------------------------------
  // Engine API
  // --------------------------------------------------
  async function runAction(pluginId, actionName, meta = {}) {
    const lockKey = `${pluginId}:${actionName}`;
    acquireLock(lockKey);

    try {
      const action = registry.getAction(pluginId, actionName);
      if (!action) {
        throw new Error(`Plugin action not found: ${pluginId}:${actionName}`);
      }

      const plugin = registry.get(pluginId);
      if (plugin?.enabled === false) {
        const err = new Error("plugin_disabled");
        err.code = "PLUGIN_DISABLED";
        throw err;
      }

      const pluginDir = path.join(pluginsDir, pluginId);

      const ctx = {
        meta,
        prisma,
        logger,
        registry,
        pluginId,
        actionName
      };

      const isWasm =
        action.runtime === "wasm" ||
        action.type === "wasm" ||
        action.file?.endsWith(".wasm");

      if (isWasm) {
        return wasmExecutor.run({
          pluginId,
          pluginDir,
          wasmFile: action.file,
          exportName: action.export || action.fnName || "run",
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
    } finally {
      releaseLock(lockKey);
    }
  }

  const engine = {
    loader,
    registry,
    vmExecutor,
    wasmExecutor,
    plugins,
    runAction,
    isLocked: (p, a) => isLocked(`${p}:${a}`)
  };

  // --------------------------------------------------
  // ROUTES (single mount point)
  // --------------------------------------------------
  const apiRouter = express.Router();

  apiRouter.use(
    pluginsRoutes({
      logger,
      ajv,
      publicKeyPem,
      prisma,
      loader,
      registry,
      engine
    })
  );

  apiRouter.use(
    pluginConfigRoutes({
      prisma,
      registry,
      logger,
      ajv
    })
  );

  app.use("/api/plugins", apiRouter);

  // UI routes are separate by design
  app.use("/plugins/ui", pluginUIRoutes({ logger }));

  // Expose engine
  app.locals.pluginEngine = engine;

  logger.info("✅ Plugin Module Ready");

  return engine;
};
