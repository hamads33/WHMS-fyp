/**
 * stripe/plugin.js
 * ------------------------------------------------------------------
 * Stripe Payment Gateway plugin.
 */

const StripeGatewayService = require("./service");
const buildRouter = require("./api");

module.exports = {
  meta: {
    name: "stripe",
    version: "1.0.0",
    description: "Stripe payment gateway integration",
    capabilities: ["api", "billing", "payment-gateway"],
  },

  register(ctx) {
    const { services, config, app, logger } = ctx;

    config.set("secretKey", process.env.STRIPE_SECRET_KEY || "");
    config.set("webhookSecret", process.env.STRIPE_WEBHOOK_SECRET || "");
    config.set("appUrl", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

    const gatewayService = new StripeGatewayService({
      secretKey: config.get("secretKey"),
      webhookSecret: config.get("webhookSecret"),
      appUrl: config.get("appUrl"),
      logger,
    });

    // Register service specifically for Stripe
    services.register(`paymentGateway:${this.meta.name}`, gatewayService);

    // Mount plugin API routes
    if (app) {
      const router = buildRouter(ctx);
      app.use(`/api/plugins/${this.meta.name}`, router);
      logger.info(`[stripe] API routes mounted at /api/plugins/${this.meta.name}`);
    }

    logger.info("[stripe] Plugin registered");
  },

  boot(ctx) {
    ctx.logger.info("[stripe] Plugin booted");
  },

  shutdown(ctx) {
    ctx.logger.info("[stripe] Plugin shutting down");
  },
};
