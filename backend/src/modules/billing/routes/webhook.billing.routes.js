
// ============================================================
// WEBHOOK ROUTES (separate file for clarity — no auth guard)
// ============================================================

/**
 * Webhook Routes
 * Path: src/modules/billing/routes/webhook.billing.routes.js
 *
 * Mount point: /api/billing/webhooks
 *
 * NOTE: These must NOT be behind authGuard — gateway servers
 * authenticate via their own signature mechanism.
 * Verify signatures inside the controller handlers.
 *
 * Usage in app.js:
 *   app.use('/api/billing/webhooks', require('./modules/billing/routes/client.billing.routes').webhookRouter);
 *
 * Or mount separately:
 *   app.use('/api/billing/webhooks', webhookBillingRoutes);
 */

const express = require("express");
const webhookRouter = express.Router();

/**
 * Webhooks are now handled by individual plugins.
 * Example: Stripe webhook is at /api/plugins/stripe/webhook
 */
webhookRouter.post("/:gateway", (req, res) => {
  res.status(410).json({
    error: "Gone",
    message: "Core webhook handlers are deprecated. Gateways must process their own webhooks via plugin routes.",
  });
});

module.exports.webhookRouter = webhookRouter;