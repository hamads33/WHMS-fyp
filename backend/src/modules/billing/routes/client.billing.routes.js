/**
 * Client Billing Routes
 * Path: src/modules/billing/routes/client.billing.routes.js
 *
 * Mount point: /api/client/billing
 *
 * Clients can:
 *   - View and update their billing profile
 *   - View their invoices
 *   - Pay invoices via gateway
 *   - View their payment history
 *   - Get a billing summary
 */

const express = require("express");
const router = express.Router();
const authGuard = require("../../auth/middlewares/auth.guard");
const validate = require("../../services/middleware/validation.middleware");

const billingCtrl = require("../controllers/billing.controller");
const invoiceCtrl = require("../controllers/invoice.controller");
const paymentCtrl = require("../controllers/payment.controller");

const {
  upsertBillingProfileDto,
  initiatePaymentDto,
} = require("../dtos");

// ============================================================
// BILLING PROFILE
// ============================================================

/**
 * GET /api/client/billing/profile
 */
router.get("/profile", authGuard, billingCtrl.getProfile);

/**
 * PUT /api/client/billing/profile
 * Body: { currency?, billingAddress?, city?, country?, postalCode?, taxId? }
 */
router.put(
  "/profile",
  authGuard,
  validate(upsertBillingProfileDto),
  billingCtrl.upsertProfile
);

/**
 * GET /api/client/billing/summary
 * Full billing overview: invoices totals, balance due, payment history
 */
router.get("/summary", authGuard, billingCtrl.getClientSummary);

// ============================================================
// INVOICES
// ============================================================

/**
 * GET /api/client/billing/invoices
 * Query: status, limit, offset
 */
router.get("/invoices", authGuard, invoiceCtrl.listMine);

/**
 * GET /api/client/billing/invoices/:id
 */
router.get("/invoices/:id", authGuard, invoiceCtrl.get);
router.get("/invoices/:id/pdf", authGuard, invoiceCtrl.downloadPdf);

// ============================================================
// PAYMENTS
// ============================================================

/**
 * POST /api/client/billing/invoices/:invoiceId/pay
 * Initiate a gateway payment session for an invoice.
 *
 * Body: { gateway }  — "stripe" | "paypal"
 */
router.post(
  "/invoices/:invoiceId/pay",
  authGuard,
  validate(initiatePaymentDto),
  paymentCtrl.initiatePayment
);

/**
 * GET /api/client/billing/payments
 * Client's own payment history.
 * Query: status, limit, offset
 */
router.get("/payments", authGuard, paymentCtrl.listMine);

module.exports = router;
