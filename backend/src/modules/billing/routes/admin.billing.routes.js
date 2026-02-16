/**
 * Admin Billing Routes
 * Path: src/modules/billing/routes/admin.billing.routes.js
 * Base mount: /api/admin/billing
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/billing.controller");
const validate = require("../../services/middleware/validation.middleware"); // ✅ FIXED: actual path
const {
  createInvoiceDto,
  updateInvoiceDto,
  generateFromOrderDto,
  applyDiscountDto,
  recordPaymentDto,
  initiateGatewayDto,
  gatewayCallbackDto,
  processRefundDto,
  billingProfileDto,
  createTaxRuleDto,
  updateTaxRuleDto,
} = require("../dtos/billing.dtos");

// ============================================================
// INVOICES
// ============================================================

// List all invoices        GET  /api/admin/billing/invoices
router.get("/invoices", ctrl.adminListInvoices);

// Get overdue invoices     GET  /api/admin/billing/invoices/overdue
router.get("/invoices/overdue", ctrl.getOverdueInvoices);

// Get specific invoice     GET  /api/admin/billing/invoices/:id
router.get("/invoices/:id", ctrl.getInvoice);

// Create manual invoice    POST /api/admin/billing/invoices
router.post("/invoices", validate(createInvoiceDto), ctrl.createInvoice);

// Generate from order      POST /api/admin/billing/orders/:orderId/invoice
router.post(
  "/orders/:orderId/invoice",
  validate(generateFromOrderDto),
  ctrl.generateFromOrder
);

// Update draft invoice     PUT  /api/admin/billing/invoices/:id
router.put("/invoices/:id", validate(updateInvoiceDto), ctrl.updateInvoice);

// Cancel invoice           POST /api/admin/billing/invoices/:id/cancel
router.post("/invoices/:id/cancel", ctrl.cancelInvoice);

// Apply discount/credit    POST /api/admin/billing/invoices/:id/discount
router.post(
  "/invoices/:id/discount",
  validate(applyDiscountDto),
  ctrl.applyDiscount
);

// ============================================================
// PAYMENTS
// ============================================================

// Record manual payment    POST /api/admin/billing/invoices/:invoiceId/payments
router.post(
  "/invoices/:invoiceId/payments",
  validate(recordPaymentDto),
  ctrl.recordPayment
);

// List payments for invoice GET /api/admin/billing/invoices/:invoiceId/payments
router.get("/invoices/:invoiceId/payments", ctrl.listInvoicePayments);

// Initiate gateway payment  POST /api/admin/billing/invoices/:invoiceId/pay
router.post(
  "/invoices/:invoiceId/pay",
  validate(initiateGatewayDto),
  ctrl.initiateGatewayPayment
);

// Gateway callback          POST /api/admin/billing/payments/:paymentId/callback
router.post(
  "/payments/:paymentId/callback",
  validate(gatewayCallbackDto),
  ctrl.gatewayCallback
);

// Get payment by ID         GET  /api/admin/billing/payments/:id
router.get("/payments/:id", ctrl.getPayment);

// Full payment history      GET  /api/admin/billing/payments
router.get("/payments", ctrl.getPaymentHistory);

// ============================================================
// REFUNDS
// ============================================================

// Process refund            POST /api/admin/billing/payments/:paymentId/refund
router.post(
  "/payments/:paymentId/refund",
  validate(processRefundDto),
  ctrl.processRefund
);

// List refunds for payment  GET  /api/admin/billing/payments/:paymentId/refunds
router.get("/payments/:paymentId/refunds", ctrl.listPaymentRefunds);

// Get refund by ID          GET  /api/admin/billing/refunds/:id
router.get("/refunds/:id", ctrl.getRefund);

// ============================================================
// BILLING PROFILES
// ============================================================

// List all profiles         GET  /api/admin/billing/profiles
router.get("/profiles", ctrl.adminListProfiles);

// Get client profile        GET  /api/admin/billing/profiles/:clientId
router.get("/profiles/:clientId", ctrl.adminGetProfile);

// Update client profile     PUT  /api/admin/billing/profiles/:clientId
router.put(
  "/profiles/:clientId",
  validate(billingProfileDto),
  ctrl.adminUpdateProfile
);

// ============================================================
// TAX RULES
// ============================================================

// List all tax rules        GET  /api/admin/billing/tax-rules
router.get("/tax-rules", ctrl.listTaxRules);

// Create tax rule           POST /api/admin/billing/tax-rules
router.post("/tax-rules", validate(createTaxRuleDto), ctrl.createTaxRule);

// Update tax rule           PUT  /api/admin/billing/tax-rules/:id
router.put("/tax-rules/:id", validate(updateTaxRuleDto), ctrl.updateTaxRule);

// Delete tax rule           DELETE /api/admin/billing/tax-rules/:id
router.delete("/tax-rules/:id", ctrl.deleteTaxRule);

// ============================================================
// RECURRING BILLING
// ============================================================

// Preview upcoming renewals  GET  /api/admin/billing/renewals/preview
router.get("/renewals/preview", ctrl.previewRenewals);

// Trigger renewal processing POST /api/admin/billing/renewals/process
router.post("/renewals/process", ctrl.processRenewals);

// Manual renewal for order   POST /api/admin/billing/orders/:orderId/renew
router.post("/orders/:orderId/renew", ctrl.manualRenewal);

// ============================================================
// REPORTING
// ============================================================

// Revenue summary            GET /api/admin/billing/reports/revenue
router.get("/reports/revenue", ctrl.getRevenueSummary);

// Monthly revenue chart      GET /api/admin/billing/reports/monthly
router.get("/reports/monthly", ctrl.getMonthlyRevenue);

// Outstanding balances       GET /api/admin/billing/reports/outstanding
router.get("/reports/outstanding", ctrl.getOutstandingBalances);

// Transaction audit log      GET /api/admin/billing/reports/transactions
router.get("/reports/transactions", ctrl.getTransactionLog);

// Client billing summary     GET /api/admin/billing/reports/clients/:clientId
router.get("/reports/clients/:clientId", ctrl.getClientSummary);

module.exports = router;