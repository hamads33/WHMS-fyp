const SlackNotifierService = require("./service");
const makeHooks            = require("./hooks");
const buildRouter          = require("./api");

module.exports = {
  meta: {
    name         : "slack-notifier",
    version      : "1.1.0",
    description  : "Posts real-time Slack notifications for orders, invoices, and service lifecycle events",
    capabilities : ["hooks", "api", "ui"],
    permissions  : ["notifications.send"],
    ui: {
      adminPages: [
        { id: "dashboard", label: "Slack Notifications", icon: "message-square" },
      ],
    },
  },

  register(ctx) {
    const { services, hooks, config, app, logger } = ctx;

    // Config — set SLACK_WEBHOOK_URL env to enable real delivery
    config.set("webhookUrl", process.env.SLACK_WEBHOOK_URL || null);
    config.set("channel",    process.env.SLACK_CHANNEL    || "#whms-alerts");

    // Service
    const notifier = new SlackNotifierService({
      webhookUrl : config.get("webhookUrl"),
      channel    : config.get("channel"),
      logger,
    });
    services.register("slackNotifier", notifier);

    // Hooks
    const { onOrderCreated, onInvoicePaid, onServiceProvision, onServiceSuspend, onServiceTerminate } =
      makeHooks(notifier);

    hooks.register("order.created",      onOrderCreated,      this.meta.name);
    hooks.register("invoice.paid",       onInvoicePaid,       this.meta.name);
    hooks.register("service.provision",  onServiceProvision,  this.meta.name);
    hooks.register("service.suspend",    onServiceSuspend,    this.meta.name);
    hooks.register("service.terminate",  onServiceTerminate,  this.meta.name);

    // API
    if (app) {
      app.use("/api/plugins/slack-notifier", buildRouter({ notifier, logger }));
      logger.info("[slack-notifier] API mounted at /api/plugins/slack-notifier");
    }

    const mode = config.get("webhookUrl") ? "webhook delivery" : "log-only mode";
    logger.info(`[slack-notifier] Plugin registered — ${mode}`);
  },

  boot(ctx) {
    const { services, logger } = ctx;
    // Verify we're registered in the service container
    if (services.has("slackNotifier")) {
      logger.info("[slack-notifier] ✓ slackNotifier service available");
    }
    logger.info("[slack-notifier] Plugin booted");
  },

  shutdown(ctx) {
    ctx.logger.info("[slack-notifier] Plugin shutting down");
  },
};
