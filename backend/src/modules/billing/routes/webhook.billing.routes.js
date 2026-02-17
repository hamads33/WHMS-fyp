
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
const paymentCtrl = require("../controllers/payment.controller");
const webhookRouter = express.Router();

/**
 * POST /api/billing/webhooks/stripe
 * Stripe webhook endpoint — handle payment events
 *
 * Important: Must use express.raw() body parser for Stripe signature verification.
 * In app.js: app.use('/api/billing/webhooks/stripe', express.raw({ type: 'application/json' }), ...)
 */
webhookRouter.post("/:gateway", paymentCtrl.handleWebhook);

module.exports.webhookRouter = webhookRouter;