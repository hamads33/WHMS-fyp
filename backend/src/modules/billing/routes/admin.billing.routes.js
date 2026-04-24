/**
 * Admin Billing Routes
 * Path: src/modules/billing/routes/admin.billing.routes.js
 *
 * Mount point: /api/admin/billing
 *
 * Covers:
 *   - Revenue stats and overviews
 *   - Invoice lifecycle management
 *   - Payment recording and refunds
 *   - Tax rule management
 *   - Billing profile management per client
 *   - Invoice generation from orders
 *   - Batch renewal and overdue processing
 */

const express = require("express");
const router = express.Router();
const validate = require("../../services/middleware/validation.middleware");

const billingCtrl = require("../controllers/billing.controller");
const invoiceCtrl = require("../controllers/invoice.controller");
const invoiceSettingsCtrl = require("../controllers/invoice-settings.controller");
const paymentCtrl = require("../controllers/payment.controller");
const taxCtrl = require("../controllers/tax.controller");

const {
  upsertBillingProfileDto,
  generateOrderInvoiceDto,
  generateRenewalInvoiceDto,
  generateFeeInvoiceDto,
  createManualInvoiceDto,
  applyDiscountDto,
  recordPaymentDto,
  processRefundDto,
  createTaxRuleDto,
  updateTaxRuleDto,
  taxPreviewDto,
  processDueRenewalsDto,
  processOverdueDto,
} = require("../dtos");

// ============================================================
// REVENUE OVERVIEW
// ============================================================

/**
 * GET /api/admin/billing/revenue
 * Revenue stats: monthly, yearly, all-time
 */
router.get("/revenue", billingCtrl.getRevenueStats);

/**
 * GET /api/admin/billing/revenue/trend?months=6
 * Monthly revenue trend for the past N months
 */
router.get("/revenue/trend", billingCtrl.getRevenueTrend);

// ============================================================
// INVOICE STATISTICS
// ============================================================

/**
 * GET /api/admin/billing/invoices/stats
 * Invoice counts and totals by status
 */
router.get("/invoices/stats", invoiceCtrl.getStats);

// ============================================================
// INVOICE GENERATION FROM ORDERS
// ============================================================

/**
 * POST /api/admin/billing/orders/:orderId/invoice
 * Generate a new-order invoice from snapshot
 */
router.post(
  "/orders/:orderId/invoice",
  validate(generateOrderInvoiceDto),
  billingCtrl.generateOrderInvoice
);

/**
 * POST /api/admin/billing/orders/:orderId/renewal-invoice
 * Generate a renewal invoice for an active order
 */
router.post(
  "/orders/:orderId/renewal-invoice",
  validate(generateRenewalInvoiceDto),
  billingCtrl.generateRenewalInvoice
);

/**
 * POST /api/admin/billing/orders/:orderId/suspension-invoice
 * Generate a suspension fee invoice (if suspensionFee > 0)
 */
router.post(
  "/orders/:orderId/suspension-invoice",
  validate(generateFeeInvoiceDto),
  billingCtrl.generateSuspensionInvoice
);

/**
 * POST /api/admin/billing/orders/:orderId/termination-invoice
 * Generate a termination fee invoice (if terminationFee > 0)
 */
router.post(
  "/orders/:orderId/termination-invoice",
  validate(generateFeeInvoiceDto),
  billingCtrl.generateTerminationInvoice
);

/**
 * GET /api/admin/billing/orders/:orderId/invoices
 * All invoices linked to a specific order
 */
router.get("/orders/:orderId/invoices", invoiceCtrl.listByOrder);

// ============================================================
// MANUAL INVOICE
// ============================================================

/**
 * POST /api/admin/billing/invoices/manual
 * Create a manual invoice with custom line items
 */
router.post(
  "/invoices/manual",
  validate(createManualInvoiceDto),
  billingCtrl.createManualInvoice
);

// ============================================================
// INVOICE LIST & GET
// ============================================================

/**
 * GET /api/admin/billing/invoices
 * Query: status, clientId, orderId, limit, offset
 */
router.get("/invoices", invoiceCtrl.list);

/**
 * GET /api/admin/billing/invoices/:id
 */
router.get("/invoices/:id", invoiceCtrl.get);
router.get("/invoices/:id/pdf", invoiceCtrl.downloadPdf);

// ============================================================
// INVOICE STATUS TRANSITIONS
// ============================================================

/**
 * POST /api/admin/billing/invoices/:id/send
 * Transition draft → unpaid and set issuedAt
 */
router.post("/invoices/:id/send", invoiceCtrl.send);

/**
 * POST /api/admin/billing/invoices/:id/cancel
 */
router.post("/invoices/:id/cancel", invoiceCtrl.cancel);

/**
 * POST /api/admin/billing/invoices/:id/mark-paid
 * Admin override: mark as paid without recording a payment
 */
router.post("/invoices/:id/mark-paid", invoiceCtrl.markPaid);

// ============================================================
// INVOICE DISCOUNTS
// ============================================================

/**
 * POST /api/admin/billing/invoices/:id/discount
 * Apply an extra discount to a draft or unpaid invoice
 */
router.post(
  "/invoices/:id/discount",
  validate(applyDiscountDto),
  invoiceCtrl.applyDiscount
);

// ============================================================
// PAYMENTS
// ============================================================

/**
 * GET /api/admin/billing/payments/stats
 */
router.get("/payments/stats", paymentCtrl.getStats);

/**
 * GET /api/admin/billing/payments
 * Query: status, gateway, clientId, limit, offset
 */
router.get("/payments", paymentCtrl.listAll);

/**
 * GET /api/admin/billing/payments/:id
 */
router.get("/payments/:id", paymentCtrl.get);

/**
 * GET /api/admin/billing/payments/:id/refunds
 */
router.get("/payments/:id/refunds", paymentCtrl.listRefunds);

/**
 * POST /api/admin/billing/invoices/:invoiceId/payments
 * Record a manual payment against an invoice
 */
router.post(
  "/invoices/:invoiceId/payments",
  validate(recordPaymentDto),
  paymentCtrl.create
);

/**
 * GET /api/admin/billing/invoices/:invoiceId/payments
 */
router.get("/invoices/:invoiceId/payments", paymentCtrl.listByInvoice);

/**
 * POST /api/admin/billing/payments/:id/refund
 */
router.post(
  "/payments/:id/refund",
  validate(processRefundDto),
  paymentCtrl.refund
);

// ============================================================
// TAX RULES
// ============================================================

/**
 * GET /api/admin/billing/tax-rules
 * Query: activeOnly=true
 */
router.get("/tax-rules", taxCtrl.list);

/**
 * POST /api/admin/billing/tax-rules/preview
 * Preview tax calculation without creating anything
 */
router.post("/tax-rules/preview", validate(taxPreviewDto), taxCtrl.preview);

/**
 * POST /api/admin/billing/tax-rules
 */
router.post("/tax-rules", validate(createTaxRuleDto), taxCtrl.create);

/**
 * GET /api/admin/billing/tax-rules/:id
 */
router.get("/tax-rules/:id", taxCtrl.get);

/**
 * PUT /api/admin/billing/tax-rules/:id
 */
router.put("/tax-rules/:id", validate(updateTaxRuleDto), taxCtrl.update);

/**
 * DELETE /api/admin/billing/tax-rules/:id
 */
router.delete("/tax-rules/:id", taxCtrl.delete);

// ============================================================
// CLIENT BILLING PROFILES (Admin manages all clients)
// ============================================================

/**
 * GET /api/admin/billing/clients/:clientId/profile
 */
router.get("/clients/:clientId/profile", billingCtrl.getProfile);

/**
 * PUT /api/admin/billing/clients/:clientId/profile
 */
router.put(
  "/clients/:clientId/profile",
  validate(upsertBillingProfileDto),
  billingCtrl.upsertProfile
);

/**
 * GET /api/admin/billing/clients/:clientId/summary
 */
router.get("/clients/:clientId/summary", billingCtrl.getClientSummary);

/**
 * GET /api/admin/billing/clients/:clientId/invoices
 * Query: status, limit, offset
 */
router.get("/clients/:clientId/invoices", invoiceCtrl.list);

// ============================================================
// BATCH OPERATIONS (Cron-safe endpoints)
// ============================================================

/**
 * POST /api/admin/billing/process-renewals
 * Trigger renewal invoice generation for orders due within N days
 *
 * Body: { daysAhead? }
 */
router.post(
  "/process-renewals",
  validate(processDueRenewalsDto),
  billingCtrl.processDueRenewals
);

/**
 * POST /api/admin/billing/process-overdue
 * Mark overdue invoices; optionally suspend affected orders
 *
 * Body: { autoSuspend? }
 */
router.post(
  "/process-overdue",
  validate(processOverdueDto),
  billingCtrl.processOverdue
);

// POST /api/admin/billing/process-late-fees
router.post("/process-late-fees", billingCtrl.processLateFees);

// POST /api/admin/billing/invoices/:id/late-fee
router.post("/invoices/:id/late-fee", billingCtrl.applyLateFee);

// ============================================================
// INVOICE SETTINGS
// ============================================================

/**
 * GET /api/admin/billing/settings/invoice
 * Retrieve global invoice configuration
 */
router.get("/settings/invoice", invoiceSettingsCtrl.get);

/**
 * PUT /api/admin/billing/settings/invoice
 * Update global invoice configuration
 */
router.put("/settings/invoice", invoiceSettingsCtrl.update);

module.exports = router;