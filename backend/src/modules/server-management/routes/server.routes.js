const router = require("express").Router();
const ctrl = require("../controllers/server.controller");
const provCtrl = require("../controllers/server-provisioning.controller");
const timelineCtrl = require("../controllers/activity-timeline.controller");
const {
  validateCreateServer,
  validateUpdateServer,
  validateCreateAccount,
  validateUpdateQuotas,
  validateMaintenance,
} = require("../validation/server.validation");

// ── Dashboard (must be before /:id to avoid param collision) ──
router.get("/dashboard", ctrl.getDashboard);

// ── Global accounts (before /:id routes) ─────────────────────
router.get("/accounts", ctrl.getAllAccounts);

// ── Server CRUD ───────────────────────────────────────────────
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", validateCreateServer, ctrl.create);
router.patch("/:id", validateUpdateServer, ctrl.update);
router.delete("/:id", ctrl.remove);

// ── Connection & Live Metrics ─────────────────────────────────
router.post("/:id/test", ctrl.testConnection);
router.get("/:id/metrics", ctrl.getMetrics);

// ── Metrics History (Feature 2) ───────────────────────────────
router.get("/:id/metrics/history", ctrl.getMetricsHistory);

// ── Maintenance ───────────────────────────────────────────────
router.patch("/:id/maintenance", validateMaintenance, ctrl.setMaintenance);

// ── Capabilities (Feature 4) ──────────────────────────────────
router.get("/:id/capabilities", ctrl.getCapabilities);

// ── Provisioning (queued) ─────────────────────────────────────
router.get("/:id/accounts", provCtrl.listAccountsByServer);
router.post("/:id/accounts", validateCreateAccount, provCtrl.createAccount);
router.patch("/accounts/:accountId/suspend", provCtrl.suspendAccount);
router.patch("/accounts/:accountId/terminate", provCtrl.terminateAccount);

// ── Account Resource Quotas (Feature 3) ──────────────────────
router.get("/accounts/:accountId/usage", ctrl.getAccountUsage);
router.patch("/accounts/:accountId/quotas", validateUpdateQuotas, ctrl.updateAccountQuotas);

// ── Logs ─────────────────────────────────────────────────────
router.get("/:id/logs", provCtrl.getLogs);

// ── Activity Timeline (Feature 6) ─────────────────────────────
router.get("/:id/activity", timelineCtrl.getTimeline);

module.exports = router;
