// src/modules/plugins/index.js

// Keep registry import
const registry = require("./pluginEngine/registry");

// Correct loader import
const PluginLoader = require("./pluginEngine/loader");

// Plugin routes (installer + settings + list)
const pluginsRoutes = require("./routes/plugins.routes");

// NEW: VM2 executor + CSP UI sandbox
const PluginExecutor = require("./pluginEngine/executor");
const UiSandbox = require("./ui/sandbox.middleware");
const pluginUIRoutes = require("./routes/pluginUI.routes");
const path = require("path");

module.exports = async function initPluginModule({
  app,
  prisma,
  logger,
  ajv,
  publicKeyPem
}) {
  if (!app) {
    throw new Error("initPluginModule requires { app }");
  }

  logger.info("🔌 Initializing Plugin Module...");

  // ---------------------------------------------
  // 1) Load plugins from file system
  // ---------------------------------------------
  const loader = new PluginLoader({
    logger,
    ajv,
    prisma,
    publicKeyPem
  });

  let plugins = {};
  try {
    // loadAll returns Map<pluginId, pluginDefinition>
    plugins = await loader.loadAll();
  } catch (err) {
    logger.error("❌ Plugin loader failed:", err);
  }

  // ---------------------------------------------
  // 2) Setup VM2 Executor (server-side)
  // ---------------------------------------------
  const executor = new PluginExecutor({
    logger,
    auditService: null, // optional: pass audit service
    allowedHosts: process.env.PLUGIN_ALLOWED_HOSTS
      ? process.env.PLUGIN_ALLOWED_HOSTS.split(",").map(x => x.trim())
      : []
  });

  // ---------------------------------------------
  // 3) Mount CSP Sandbox router for plugin UI
  // ---------------------------------------------
  const uiRouter = UiSandbox({
    pluginsBaseDir: path.join(process.cwd(), "plugins", "actions"),
    getAllowedConnectHosts: pluginId => {
      const p = registry.get(pluginId);
      return p?.manifest?.allowedHosts || [];
    }
  });

  // mount at /plugins for iframe + static UI
  app.use("/plugins", uiRouter);
app.use("/plugins", pluginUIRoutes({ logger }));
  // ---------------------------------------------
  // 4) Mount plugin REST routes (installer, settings, list)
  // ---------------------------------------------
  const router = pluginsRoutes({
    logger,
    ajv,
    publicKeyPem,
    prisma,
    loader,   // pass loader to routes
    registry  // pass registry to routes
  });

  app.use("/api/plugins", router);

  // ---------------------------------------------
  // 5) Finish initialization
  // ---------------------------------------------
  logger.info("✅ Plugin Module Ready");

  return {
    loader,
    registry,
    plugins,
    executor   // expose VM2 executor for automation engine
  };
};
