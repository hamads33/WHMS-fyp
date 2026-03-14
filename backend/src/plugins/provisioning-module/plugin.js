/**
 * provisioning-module/plugin.js
 * ------------------------------------------------------------------
 * Example provisioning module plugin.
 *
 * Demonstrates:
 *  - Registering a service in the service container
 *  - Registering hooks (service.provision, service.suspend, service.terminate)
 *  - Listening to cron events for polling
 *  - Mounting API routes
 */

const ProvisioningService = require("./service");
const { onServiceProvision, onServiceSuspend, onServiceTerminate, onCronHourly } = require("./hooks");
const buildRouter = require("./api");

module.exports = {
  meta: {
    name         : "provisioning-module",
    version      : "1.0.0",
    description  : "Example provisioning module plugin — demonstrates service provisioning",
    capabilities : ["hooks", "api", "cron", "provisioning"],
  },

  /**
   * register(ctx)
   * ------------------------------------------------------------------
   * Wire up services, hooks, routes.
   *
   * @param {object} ctx
   */
  register(ctx) {
    const { services, hooks, events, config, app, logger } = ctx;

    // --- Read config ---
    config.set("serverHost", process.env.PROVISIONING_SERVER_HOST || "localhost");
    config.set("apiKey",     process.env.PROVISIONING_API_KEY     || "demo-key");

    // --- Register the provisioning service ---
    const provisioningService = new ProvisioningService({
      serverHost : config.get("serverHost"),
      apiKey     : config.get("apiKey"),
      logger,
    });
    services.register("provisioningModule", provisioningService);

    // --- Register lifecycle hooks ---
    hooks.register("service.provision",  onServiceProvision,  this.meta.name);
    hooks.register("service.suspend",    onServiceSuspend,    this.meta.name);
    hooks.register("service.terminate",  onServiceTerminate,  this.meta.name);

    // --- Listen to cron events ---
    events.on("cron.hourly", onCronHourly);

    // --- Mount plugin API routes ---
    if (app) {
      const router = buildRouter(ctx);
      app.use("/api/plugins/provisioning", router);
      logger.info("[provisioning-module] API routes mounted at /api/plugins/provisioning");
    }

    logger.info("[provisioning-module] Plugin registered");
  },

  /**
   * boot(ctx)
   * ------------------------------------------------------------------
   * Called after all plugins have registered.
   * Verify dependencies from other plugins here if needed.
   *
   * @param {object} ctx
   */
  boot(ctx) {
    const { logger } = ctx;
    logger.info("[provisioning-module] Plugin booted");
  },

  /**
   * shutdown(ctx)
   *
   * @param {object} ctx
   */
  shutdown(ctx) {
    const { logger } = ctx;
    logger.info("[provisioning-module] Plugin shutting down");
  },
};
