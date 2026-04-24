/**
 * Payment Controller
 * Path: src/modules/billing/controllers/payment.controller.js
 */

const paymentService = require("../services/payment.service");

// ============================================================
// CREATE / RECORD PAYMENT
// ============================================================

/**
 * POST /admin/billing/invoices/:invoiceId/payments
 * Record a manual payment against an invoice.
 *
 * Body: { amount, currency?, gateway?, gatewayRef?, notes? }
 */
exports.create = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const result = await paymentService.create(invoiceId, req.body, req.user?.id);

    res.status(201).json({
      success: true,
      message: "Payment recorded",
      payment: result.payment,
      invoice: result.invoice,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /client/billing/invoices/:invoiceId/pay
 * Initiate a gateway checkout session for an invoice.
 *
 * Body: { gateway }  (stripe | paypal)
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { gateway } = req.body;

    if (!gateway) {
      return res.status(400).json({ success: false, error: "gateway is required" });
    }

    const result = await paymentService.initiateGatewayPayment(
      invoiceId,
      gateway,
      req.body,
      req.user?.id
    );

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};


// ============================================================
// READ
// ============================================================

/**
 * GET /admin/billing/payments
 * Query: status, gateway, clientId, limit, offset
 */
exports.listAll = async (req, res) => {
  try {
    const { status, gateway, clientId, limit, offset } = req.query;

    const { payments, total } = await paymentService.listAll({
      status,
      gateway,
      clientId,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    res.json({ success: true, total, count: payments.length, payments });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * GET /client/billing/payments
 * Client's own payment history.
 */
exports.listMine = async (req, res) => {
  try {
    const { status, limit, offset } = req.query;

    const { payments, total } = await paymentService.listByClient(req.user.id, {
      status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    res.json({ success: true, total, count: payments.length, payments });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * GET /admin/billing/invoices/:invoiceId/payments
 */
exports.listByInvoice = async (req, res) => {
  try {
    const payments = await paymentService.listByInvoice(req.params.invoiceId);
    res.json({ success: true, count: payments.length, payments });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * GET /admin/billing/payments/:id
 */
exports.get = async (req, res) => {
  try {
    const payment = await paymentService.getById(req.params.id);
    res.json({ success: true, payment });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============================================================
// REFUNDS
// ============================================================

/**
 * POST /admin/billing/payments/:id/refund
 * Process a refund for a payment.
 *
 * Body: { amount, reason?, notes? }
 */
exports.refund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.body.amount || parseFloat(req.body.amount) <= 0) {
      return res.status(400).json({ success: false, error: "refund amount is required and must be > 0" });
    }

    const result = await paymentService.refund(id, req.body, req.user?.id);

    res.json({
      success: true,
      message: result.isFullRefund ? "Full refund processed" : "Partial refund processed",
      refund: result.refund,
      isFullRefund: result.isFullRefund,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * GET /admin/billing/payments/:id/refunds
 */
exports.listRefunds = async (req, res) => {
  try {
    const refunds = await paymentService.listRefundsByPayment(req.params.id);
    res.json({ success: true, count: refunds.length, refunds });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============================================================
// STATISTICS
// ============================================================

/**
 * GET /admin/billing/payments/stats
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await paymentService.getStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};