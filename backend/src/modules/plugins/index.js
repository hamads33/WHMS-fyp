// src/modules/plugins/index.js

const path = require("path");
const PluginLoader = require("./pluginEngine/loader");
const registry = require("./pluginEngine/registry");   // <-- FIXED: Singleton instance
const VMExecutor = require("./pluginEngine/vmExecutor");
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

  // Loader now uses shared registry instance
  const loader = new PluginLoader({
    pluginsDir: path.join(process.cwd(), "plugins", "actions"),
    logger,
    ajv,
    registry,
    publicKeyPem
  });

  const plugins = await loader.loadAll();

  // Create VM executor
  const vmExecutor = new VMExecutor({ logger });

  // REST API routes
  const router = pluginsRoutes({
    logger,
    ajv,
    publicKeyPem,
    prisma,
    loader,
    registry
  });

  // mount API endpoints
  app.use("/api/plugins", router);

  // mount UI routes
  app.use("/plugins/ui", pluginUIRoutes({ logger }));

  // expose plugin engine to automation module
  app.locals.pluginEngine = {
    loader,
    registry,
    vmExecutor,
    plugins
  };

  logger.info("✅ Plugin Module Ready");

  return {
    loader,
    registry,
    vmExecutor,
    plugins
  };
};
