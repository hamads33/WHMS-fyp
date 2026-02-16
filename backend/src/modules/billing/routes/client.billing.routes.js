/**
 * Client Billing Routes
 * Path: src/modules/billing/routes/client.billing.routes.js
 * Base mount: /api/client/billing
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/billing.controller");
const validate = require("../../services/middleware/validation.middleware");        // ✅ FIXED: matches ../middleware/ pattern
const authGuard = require("../../auth/middlewares/auth.guard");        // ✅ CORRECT: matches client.order.routes.js pattern
const {
  billingProfileDto,
  initiateGatewayDto,
  gatewayCallbackDto,
} = require("../dtos/billing.dtos");

// ============================================================
// INVOICES (read-only for clients)
// ============================================================

// List own invoices          GET  /api/client/billing/invoices
router.get("/invoices", authGuard, ctrl.listClientInvoices);

// Get specific invoice       GET  /api/client/billing/invoices/:id
router.get("/invoices/:id", authGuard, ctrl.getInvoice);

// ============================================================
// PAYMENTS
// ============================================================

// Initiate gateway payment   POST /api/client/billing/invoices/:invoiceId/pay
router.post(
  "/invoices/:invoiceId/pay",
  authGuard,
  validate(initiateGatewayDto),
  ctrl.initiateGatewayPayment
);

// Gateway callback (public - no auth, verified by gateway secret)
// POST /api/client/billing/payments/:paymentId/callback
router.post(
  "/payments/:paymentId/callback",
  validate(gatewayCallbackDto),
  ctrl.gatewayCallback
);

// List own payments          GET  /api/client/billing/payments
router.get("/payments", authGuard, ctrl.listClientPayments);

// ============================================================
// BILLING PROFILE
// ============================================================

// Get own profile            GET  /api/client/billing/profile
router.get("/profile", authGuard, ctrl.getMyProfile);

// Update own profile         PUT  /api/client/billing/profile
router.put("/profile", authGuard, validate(billingProfileDto), ctrl.updateMyProfile);

// ============================================================
// REPORTING (self-service)
// ============================================================

// Own billing summary        GET  /api/client/billing/summary
router.get("/summary", authGuard, ctrl.getClientSummary);

module.exports = router;