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
  provisionDatabaseDto,
} = require("../dtos/provisioning.dtos");
const Joi = require("joi");

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

// Install SSL for own domain
router.post(
  "/accounts/:username/ssl",
  authGuard,
  validate(Joi.object({ domain: Joi.string().domain().required() })),
  ctrl.issueSSLClient
);

// Create database for own hosting account
router.post(
  "/accounts/:username/databases",
  authGuard,
  validate(
    provisionDatabaseDto.keys({
      domain: Joi.string().domain().required(),
    })
  ),
  ctrl.createDatabaseClient
);

// ============================================================
// USAGE STATS
// ============================================================

// Get account usage statistics
router.get("/accounts/:username/stats", authGuard, ctrl.getAccountStats);

// Sync account usage statistics
router.post("/accounts/:username/sync", authGuard, ctrl.syncOwnedAccountStats);

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

// Manual provision trigger (sync)
adminRouter.post("/orders/:orderId/provision", ctrl.manualProvision);

// Async provision trigger (queued)
adminRouter.post("/orders/:orderId/provision-async", ctrl.provisionAccountAsync);

// Get provisioning job status
adminRouter.get("/jobs/:jobId", ctrl.getProvisioningStatus);

// Async suspend (queued)
adminRouter.post("/orders/:orderId/suspend-async", ctrl.suspendAccountAsync);

// Async unsuspend (queued)
adminRouter.post("/orders/:orderId/unsuspend-async", ctrl.unsuspendAccountAsync);

// Async provision domain
adminRouter.post("/accounts/:username/domains-async", ctrl.provisionDomainAsync);

// Test CyberPanel SSH connection
adminRouter.get("/test-connection", ctrl.testCyberPanelConnection);

// Issue SSL (queued)
adminRouter.post("/accounts/:username/ssl", ctrl.issueSSLAsync);

// Create database (queued)
adminRouter.post("/accounts/:username/databases-async", ctrl.createDatabaseAsync);

// Create email (queued)
adminRouter.post("/accounts/:username/emails-async", ctrl.createEmailAsync);

// Suspend account
adminRouter.post(
  "/accounts/:username/suspend",
  validate(Joi.object({ reason: Joi.string().optional() })),
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
