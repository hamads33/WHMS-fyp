/**
 * payment-gateway/api.js
 * ------------------------------------------------------------------
 * Express router that adds payment gateway endpoints.
 * Mounted by the plugin's register() under /api/plugins/payment-gateway.
 *
 * @param {object} ctx  - Plugin context
 * @returns {Router}
 */

const { Router } = require("express");

module.exports = function buildRouter(ctx) {
  const router = Router();
  const { logger } = ctx;

  /**
   * GET /api/plugins/payment-gateway/status
   * Returns gateway health / configuration status.
   */
  router.get("/status", (req, res) => {
    const svc = ctx.services.get("paymentGateway");
    res.json({
      gateway : svc ? svc.name : "not-loaded",
      status  : svc ? "active" : "unavailable",
    });
  });

  /**
   * POST /api/plugins/payment-gateway/charge
   * Body: { customerId, amount, currency, description }
   */
  router.post("/charge", async (req, res) => {
    const svc = ctx.services.get("paymentGateway");
    if (!svc) return res.status(503).json({ error: "Payment gateway not available" });

    try {
      const result = await svc.charge(req.body);
      res.json(result);
    } catch (err) {
      logger.error(`[PaymentGateway] charge error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/plugins/payment-gateway/refund
   * Body: { transactionId, amount? }
   */
  router.post("/refund", async (req, res) => {
    const svc = ctx.services.get("paymentGateway");
    if (!svc) return res.status(503).json({ error: "Payment gateway not available" });

    try {
      const result = await svc.refund(req.body);
      res.json(result);
    } catch (err) {
      logger.error(`[PaymentGateway] refund error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
