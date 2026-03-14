const HealthMonitorService = require("./service");
const makeHooks            = require("./hooks");
const buildRouter          = require("./api");

module.exports = {
  meta: {
    name         : "service-health-monitor",
    version      : "1.0.0",
    description  : "Monitors hosted service health across the provision/suspend/terminate lifecycle",
    capabilities : ["hooks", "api", "cron", "provisioning", "ui"],
    permissions  : ["services.read", "services.provision"],
    ui: {
      adminPages: [
        { id: "health", label: "Service Health", icon: "activity" },
      ],
    },
  },

  register(ctx) {
    const { services, hooks, events, app, logger } = ctx;

    // Service
    const monitor = new HealthMonitorService({ logger });
    services.register("healthMonitor", monitor);

    // Hooks
    const { onServiceProvision, onServiceSuspend, onServiceTerminate, onCronHourly } =
      makeHooks(monitor, logger);

    hooks.register("service.provision",  onServiceProvision,  this.meta.name);
    hooks.register("service.suspend",    onServiceSuspend,    this.meta.name);
    hooks.register("service.terminate",  onServiceTerminate,  this.meta.name);
    events.on("cron.hourly", onCronHourly);

    // API
    if (app) {
      app.use("/api/plugins/service-health-monitor", buildRouter({ monitor, logger }));
      logger.info("[service-health-monitor] API mounted at /api/plugins/service-health-monitor");
    }

    logger.info("[service-health-monitor] Plugin registered");
  },

  boot(ctx) {
    ctx.logger.info("[service-health-monitor] Plugin booted — monitoring service lifecycle");
  },

  shutdown(ctx) {
    ctx.logger.info("[service-health-monitor] Plugin shutting down");
  },
};
