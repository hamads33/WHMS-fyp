const AnalyticsWidgetService = require("./service");
const makeHooks              = require("./hooks");
const buildRouter            = require("./api");

module.exports = {
  meta: {
    name        : "analytics-widget",
    version     : "1.0.0",
    description : "Live system event tracker with an embeddable admin dashboard UI page",
    capabilities: ["hooks", "api", "ui"],
    permissions : ["events.read"],
    ui: {
      adminPages: [
        { id: "overview", label: "Analytics", icon: "bar-chart-2" },
      ],
    },
  },

  register(ctx) {
    const { services, hooks, app, logger } = ctx;

    // Service
    const analytics = new AnalyticsWidgetService({ logger });
    services.register("analyticsWidget", analytics);

    // Hook into core lifecycle events
    const { onOrderCreated, onInvoicePaid, onServiceProvision, onServiceSuspend, onServiceTerminate } =
      makeHooks(analytics);

    hooks.register("order.created",      onOrderCreated,      this.meta.name);
    hooks.register("invoice.paid",       onInvoicePaid,       this.meta.name);
    hooks.register("service.provision",  onServiceProvision,  this.meta.name);
    hooks.register("service.suspend",    onServiceSuspend,    this.meta.name);
    hooks.register("service.terminate",  onServiceTerminate,  this.meta.name);

    // Mount API + UI routes
    if (app) {
      app.use("/api/plugins/analytics-widget", buildRouter({ analytics, logger }));
      logger.info("[analytics-widget] Routes mounted at /api/plugins/analytics-widget");
    }

    logger.info("[analytics-widget] Plugin registered");
  },

  boot(ctx) {
    ctx.logger.info("[analytics-widget] Plugin booted — tracking system events");
  },

  shutdown(ctx) {
    ctx.logger.info("[analytics-widget] Plugin shutting down");
  },
};
