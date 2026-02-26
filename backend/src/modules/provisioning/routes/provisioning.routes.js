/**
 * Client Provisioning Routes
 * Path: src/modules/provisioning/routes/client.provisioning.routes.js
 * Base mount: /api/client/provisioning
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/provisioning.controller");
const validate = require("../../services/middleware/validation.middleware");
const authGuard = require("../../auth/middlewares/auth.guard");
const {
  provisionDomainDto,
  provisionEmailDto,
} = require("../dtos/provisioning.dtos");

// ============================================================
// ACCOUNTS
// ============================================================

// List own accounts
router.get("/accounts", authGuard, ctrl.listClientAccounts);

// Get account for order
router.get("/accounts/order/:orderId", authGuard, ctrl.getAccountByOrder);

// Get account details
router.get("/accounts/:username", authGuard, ctrl.getAccount);

// ============================================================
// DOMAINS
// ============================================================

// Add domain to account
router.post(
  "/accounts/:username/domains",
  authGuard,
  validate(provisionDomainDto),
  ctrl.provisionDomain
);

// ============================================================
// EMAIL
// ============================================================

// Add email account
router.post(
  "/accounts/:username/emails",
  authGuard,
  validate(provisionEmailDto),
  ctrl.provisionEmail
);

// ============================================================
// USAGE STATS
// ============================================================

// Get account usage statistics
router.get("/accounts/:username/stats", authGuard, ctrl.getAccountStats);

module.exports = router;

/**
 * Admin Provisioning Routes
 * Path: src/modules/provisioning/routes/admin.provisioning.routes.js
 * Base mount: /api/admin/provisioning
 */

const adminRouter = express.Router();

// ============================================================
// ACCOUNTS (ADMIN)
// ============================================================

// List all accounts
adminRouter.get("/accounts", ctrl.adminListAccounts);

// Get account details
adminRouter.get("/accounts/:username", ctrl.getAccount);

// Manual provision trigger
adminRouter.post("/orders/:orderId/provision", ctrl.manualProvision);

// Suspend account
adminRouter.post(
  "/accounts/:username/suspend",
  validate(require("joi").object({ reason: require("joi").string().optional() })),
  ctrl.suspendAccount
);

// Unsuspend account
adminRouter.post("/accounts/:username/unsuspend", ctrl.unsuspendAccount);

// ============================================================
// STATS & SYNCING
// ============================================================

// Sync stats for single account
adminRouter.post("/accounts/:username/sync", ctrl.syncAccountStats);

// Sync all accounts (can be called by cron)
adminRouter.post("/sync-all", ctrl.syncAllStats);

module.exports = { clientRouter: router, adminRouter };