/**
 * Billing Controller
 * Path: src/modules/billing/controllers/billing.controller.js
 *
 * Handles: billing profile, invoice generation from orders,
 * renewal processing, overdue management, and revenue stats.
 */

const billingService = require("../services/billing.service");
const invoiceSettingsService = require("../services/invoice-settings.service");

// ============================================================
// BILLING PROFILE
// ============================================================

/**
 * GET /client/billing/profile
 * GET /admin/billing/clients/:clientId/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const clientId = req.params.clientId || req.user.id;
    const profile = await billingService.getBillingProfile(clientId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /client/billing/profile
 * PUT /admin/billing/clients/:clientId/profile
 */
exports.upsertProfile = async (req, res) => {
  try {
    const clientId = req.params.clientId || req.user.id;
    const profile = await billingService.upsertBillingProfile(clientId, req.body);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * GET /client/billing/summary
 * GET /admin/billing/clients/:clientId/summary
 */
exports.getClientSummary = async (req, res) => {
  try {
    const clientId = req.params.clientId || req.user.id;
    const summary = await billingService.getClientBillingSummary(clientId);
    res.json({ success: true, ...summary });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============================================================
// INVOICE GENERATION (Admin)
// ============================================================

/**
 * POST /admin/billing/orders/:orderId/invoice
 * Generate a new-order invoice from an order snapshot.
 *
 * Body: { billingCycles?, dueDays?, status? }
 */
exports.generateOrderInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { billingCycles = 1, dueDays = 7, status = "unpaid" } = req.body;

    const invoice = await billingService.generateInvoiceFromOrder(
      orderId,
      { billingCycles, dueDays, status },
      req.user?.id
    );

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /admin/billing/orders/:orderId/renewal-invoice
 * Generate a renewal invoice.
 *
 * Body: { dueDays?, status? }
 */
exports.generateRenewalInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { dueDays = 3, status = "unpaid" } = req.body;

    const invoice = await billingService.generateRenewalInvoice(
      orderId,
      { dueDays, status },
      req.user?.id
    );

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /admin/billing/orders/:orderId/suspension-invoice
 * Generate a suspension fee invoice.
 *
 * Body: { reason? }
 */
exports.generateSuspensionInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const invoice = await billingService.generateSuspensionInvoice(
      orderId,
      reason,
      req.user?.id
    );

    if (!invoice) {
      return res.json({
        success: true,
        message: "No suspension fee configured for this plan",
        invoice: null,
      });
    }

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /admin/billing/orders/:orderId/termination-invoice
 * Generate a termination fee invoice.
 *
 * Body: { reason? }
 */
exports.generateTerminationInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const invoice = await billingService.generateTerminationInvoice(
      orderId,
      reason,
      req.user?.id
    );

    if (!invoice) {
      return res.json({
        success: true,
        message: "No termination fee configured for this plan",
        invoice: null,
      });
    }

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /admin/billing/invoices/manual
 * Create a manual invoice not linked to an order.
 *
 * Body: { clientId, currency?, lineItems[], discounts?, dueDays?, notes?, status? }
 */
exports.createManualInvoice = async (req, res) => {
  try {
    const invoice = await billingService.createManualInvoice(req.body, req.user?.id);
    res.status(201).json({ success: true, invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============================================================
// BATCH OPERATIONS (Admin / Scheduled Jobs)
// ============================================================

/**
 * POST /admin/billing/process-renewals
 * Generate renewal invoices for orders due within N days.
 *
 * Body: { daysAhead? }
 */
exports.processDueRenewals = async (req, res) => {
  try {
    const { daysAhead = 3 } = req.body;
    const result = await billingService.processDueRenewals(daysAhead);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /admin/billing/process-overdue
 * Mark overdue invoices and optionally suspend orders.
 *
 * Body: { autoSuspend? }
 */
exports.processOverdue = async (req, res) => {
  try {
    const { autoSuspend = false } = req.body;
    const result = await billingService.processOverdueInvoices(autoSuspend);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============================================================
// LATE FEES
// ============================================================

/**
 * POST /admin/billing/invoices/:id/late-fee
 * Apply a late fee to a single overdue invoice.
 */
exports.applyLateFee = async (req, res) => {
  try {
    const settings = await invoiceSettingsService.get().catch(() => ({}));
    const invoice  = await billingService.applyLateFee(req.params.id, settings);
    res.json({ success: true, message: "Late fee applied", invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /admin/billing/process-late-fees
 * Batch-apply late fees to all overdue invoices without one.
 */
exports.processLateFees = async (req, res) => {
  try {
    const settings = await invoiceSettingsService.get().catch(() => ({}));
    const result   = await billingService.processLateFees(settings);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============================================================
// ADMIN REVENUE STATS
// ============================================================

/**
 * GET /admin/billing/revenue
 */
exports.getRevenueStats = async (req, res) => {
  try {
    const stats = await billingService.getRevenueStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * GET /admin/billing/revenue/trend?months=6
 * Returns monthly revenue breakdown for the past N months
 */
exports.getRevenueTrend = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const data = await billingService.getRevenueByMonth(months);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};