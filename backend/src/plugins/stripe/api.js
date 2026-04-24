/**
 * stripe/api.js
 * ------------------------------------------------------------------
 * Express router that adds Stripe endpoints.
 */

const { Router } = require("express");
const express = require("express");
const paymentService = require("../../modules/billing/services/payment.service"); // Import core payment service to record payments

module.exports = function buildRouter(ctx) {
  const router = Router();
  const { logger } = ctx;

  /**
   * POST /api/plugins/stripe/webhook
   * Stripe webhook endpoint
   * Note: Stripe requires the raw request body to verify the signature.
   */
  router.post(
    "/webhook",
    express.raw({ type: "application/json" }), // Parse raw body for stripe
    async (req, res) => {
      const svc = ctx.services.get("paymentGateway:stripe");
      if (!svc) {
        logger.error(`[StripeGateway] Webhook received but service not registered.`);
        return res.status(503).json({ error: "Service unavailable" });
      }

      const signature = req.headers["stripe-signature"];
      
      try {
        const result = await svc.handleWebhook(req.body, signature);
        
        // If the webhook returns valid payment data, record it via the core payment service
        if (result.paymentData) {
          const { invoiceId, clientId, ...paymentFields } = result.paymentData;
          await paymentService.create(invoiceId, paymentFields, clientId);
          logger.info(`[StripeGateway] Payment recorded for invoice ${invoiceId}`);
        }

        res.json({ received: true });
      } catch (err) {
        logger.error(`[StripeGateway] Webhook error: ${err.message}`);
        res.status(400).json({ error: err.message });
      }
    }
  );

  return router;
};
