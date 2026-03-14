/**
 * provisioning-module/api.js
 * ------------------------------------------------------------------
 * Express router for provisioning management endpoints.
 * Mounted under /api/plugins/provisioning.
 *
 * @param {object} ctx  - Plugin context
 * @returns {Router}
 */

const { Router } = require("express");

module.exports = function buildRouter(ctx) {
  const router = Router();
  const { logger } = ctx;

  /**
   * GET /api/plugins/provisioning/status
   * Returns provisioning module health.
   */
  router.get("/status", (req, res) => {
    const svc = ctx.services.get("provisioningModule");
    res.json({
      module : svc ? svc.name : "not-loaded",
      status : svc ? "active" : "unavailable",
    });
  });

  /**
   * POST /api/plugins/provisioning/provision
   * Body: { username, domain, plan }
   */
  router.post("/provision", async (req, res) => {
    const svc = ctx.services.get("provisioningModule");
    if (!svc) return res.status(503).json({ error: "Provisioning module not available" });

    try {
      const result = await svc.provision(req.body);
      res.json(result);
    } catch (err) {
      logger.error(`[Provisioning] provision error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/plugins/provisioning/suspend
   * Body: { accountId, reason? }
   */
  router.post("/suspend", async (req, res) => {
    const svc = ctx.services.get("provisioningModule");
    if (!svc) return res.status(503).json({ error: "Provisioning module not available" });

    try {
      const result = await svc.suspend(req.body);
      res.json(result);
    } catch (err) {
      logger.error(`[Provisioning] suspend error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/plugins/provisioning/terminate
   * Body: { accountId }
   */
  router.post("/terminate", async (req, res) => {
    const svc = ctx.services.get("provisioningModule");
    if (!svc) return res.status(503).json({ error: "Provisioning module not available" });

    try {
      const result = await svc.terminate(req.body);
      res.json(result);
    } catch (err) {
      logger.error(`[Provisioning] terminate error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/plugins/provisioning/usage/:accountId
   */
  router.get("/usage/:accountId", async (req, res) => {
    const svc = ctx.services.get("provisioningModule");
    if (!svc) return res.status(503).json({ error: "Provisioning module not available" });

    try {
      const result = await svc.getUsage({ accountId: req.params.accountId });
      res.json(result);
    } catch (err) {
      logger.error(`[Provisioning] getUsage error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
