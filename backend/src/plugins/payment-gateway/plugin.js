/**
 * payment-gateway/plugin.js
 * ------------------------------------------------------------------
 * Example payment gateway plugin.
 *
 * Demonstrates:
 *  - Registering a service in the service container
 *  - Registering hooks (invoice.paid, order.created)
 *  - Listening to cron events
 *  - Mounting API routes
 *  - Reading plugin config
 */

const PaymentGatewayService = require("./service");
const { onInvoicePaid, onOrderCreated, onCronDaily } = require("./hooks");
const buildRouter = require("./api");

module.exports = {
  meta: {
    name         : "payment-gateway",
    version      : "1.0.0",
    description  : "Example payment gateway plugin — demonstrates the plugin contract",
    capabilities : ["hooks", "api", "cron", "billing"],
  },

  /**
   * register(ctx)
   * ------------------------------------------------------------------
   * Called once during startup, before boot().
   * Wire up services, hooks, routes here.
   *
   * @param {object} ctx  - Plugin context
   */
  register(ctx) {
    const { services, hooks, events, config, app, logger } = ctx;

    // --- Read config (set defaults for demo purposes) ---
    config.set("apiKey", process.env.PAYMENT_GATEWAY_API_KEY || "demo-key");

    // --- Register the payment gateway service ---
    const gatewayService = new PaymentGatewayService({
      apiKey : config.get("apiKey"),
      logger,
    });
    services.register("paymentGateway", gatewayService);

    // --- Register core lifecycle hooks ---
    hooks.register("invoice.paid",    onInvoicePaid,    this.meta.name);
    hooks.register("order.created",   onOrderCreated,   this.meta.name);

    // --- Listen to cron events (no cron library needed in the plugin itself) ---
    events.on("cron.daily", onCronDaily);

    // --- Mount plugin API routes ---
    if (app) {
      const router = buildRouter(ctx);
      app.use("/api/plugins/payment-gateway", router);
      logger.info("[payment-gateway] API routes mounted at /api/plugins/payment-gateway");
    }

    logger.info("[payment-gateway] Plugin registered");
  },

  /**
   * boot(ctx)
   * ------------------------------------------------------------------
   * Called after ALL plugins have been registered.
   * Safe to resolve cross-plugin service dependencies here.
   *
   * @param {object} ctx
   */
  boot(ctx) {
    const { logger } = ctx;
    logger.info("[payment-gateway] Plugin booted");
  },

  /**
   * shutdown(ctx)
   * ------------------------------------------------------------------
   * Called on graceful process shutdown (SIGTERM/SIGINT).
   * Close connections, flush buffers, etc.
   *
   * @param {object} ctx
   */
  shutdown(ctx) {
    const { logger } = ctx;
    logger.info("[payment-gateway] Plugin shutting down");
  },
};
