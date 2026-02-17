/**
 * Invoice Controller
 * Path: src/modules/billing/controllers/invoice.controller.js
 */

const invoiceService = require("../services/invoice.service");
const { generateInvoicePDF } = require("../services/pdf.service");
const invoiceSettingsService = require("../services/invoice-settings.service");

const VALID_STATUSES = ["draft", "unpaid", "paid", "overdue", "cancelled", "refunded"];

// ============================================================
// READ
// ============================================================

/**
 * GET /admin/billing/invoices
 * GET /admin/billing/clients/:clientId/invoices
 *
 * Query: status, limit, offset, orderId
 */
exports.list = async (req, res) => {
  try {
    const { status, limit, offset, orderId } = req.query;
    const clientId = req.params.clientId || req.query.clientId;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const { invoices, total } = await invoiceService.listAll({
      status,
      clientId,
      orderId,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    res.json({ success: true, total, count: invoices.length, invoices });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * GET /client/billing/invoices
 * Client can only see their own invoices.
 *
 * Query: status, limit, offset
 */
exports.listMine = async (req, res) => {
  try {
    const { status, limit, offset } = req.query;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const { invoices, total } = await invoiceService.listByClient(req.user.id, {
      status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    res.json({ success: true, total, count: invoices.length, invoices });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * GET /admin/billing/invoices/:id
 * GET /client/billing/invoices/:id
 */
exports.get = async (req, res) => {
  try {
    const invoice = await invoiceService.getById(req.params.id);

    // On the client billing endpoint, always enforce ownership.
    // Admin access uses the separate /api/admin/billing/invoices/:id route.
    // We detect "client endpoint" by checking if no admin-like role is present.
    const userRoles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    const isAdmin   = userRoles.some(r =>
      typeof r === 'string'
        ? ['admin', 'superadmin'].includes(r.toLowerCase())
        : ['admin', 'superadmin'].includes((r.name || '').toLowerCase())
    );

    if (!isAdmin && invoice.clientId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: You can only access your own invoices",
      });
    }

    res.json({ success: true, invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * GET /admin/billing/orders/:orderId/invoices
 * List all invoices for a specific order.
 */
exports.listByOrder = async (req, res) => {
  try {
    const invoices = await invoiceService.listByOrder(req.params.orderId);
    res.json({ success: true, count: invoices.length, invoices });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============================================================
// STATUS TRANSITIONS
// ============================================================

/**
 * POST /admin/billing/invoices/:id/send
 * Transition invoice from draft → unpaid and set issuedAt.
 */
exports.send = async (req, res) => {
  try {
    const invoice = await invoiceService.send(req.params.id, req.user?.id);
    res.json({ success: true, message: "Invoice sent", invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /admin/billing/invoices/:id/cancel
 * Cancel an invoice (cannot cancel paid invoices).
 */
exports.cancel = async (req, res) => {
  try {
    const invoice = await invoiceService.cancel(req.params.id, req.user?.id);
    res.json({ success: true, message: "Invoice cancelled", invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /admin/billing/invoices/:id/mark-paid
 * Admin override: manually mark invoice as paid.
 */
exports.markPaid = async (req, res) => {
  try {
    const invoice = await invoiceService.markPaid(req.params.id, req.user?.id);
    res.json({ success: true, message: "Invoice marked as paid", invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============================================================
// DISCOUNTS
// ============================================================

/**
 * POST /admin/billing/invoices/:id/discount
 * Apply an additional discount to a draft or unpaid invoice.
 *
 * Body: { type, code?, description?, amount, isPercent? }
 */
exports.applyDiscount = async (req, res) => {
  try {
    const invoice = await invoiceService.applyDiscount(
      req.params.id,
      req.body,
      req.user?.id
    );
    res.json({ success: true, message: "Discount applied", invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============================================================
// PDF DOWNLOAD
// ============================================================

/**
 * GET /admin/billing/invoices/:id/pdf
 * GET /client/billing/invoices/:id/pdf
 * Stream the invoice as a PDF download.
 */
exports.downloadPdf = async (req, res) => {
  try {
    const invoice = await invoiceService.getById(req.params.id);

    // Ownership check for client route
    const userRoles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    const isAdmin   = userRoles.some(r =>
      typeof r === "string"
        ? ["admin", "superadmin"].includes(r.toLowerCase())
        : ["admin", "superadmin"].includes((r.name || "").toLowerCase())
    );
    if (!isAdmin && invoice.clientId !== req.user?.id) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const settings = await invoiceSettingsService.get().catch(() => ({}));

    const pdf = await generateInvoicePDF(invoice, {
      companyName:    settings.companyName    || process.env.COMPANY_NAME    || "WHMS",
      companyTagline: settings.companyTagline || process.env.COMPANY_TAGLINE || "",
      companyAddress: settings.companyAddress || process.env.COMPANY_ADDRESS || "",
      companyCity:    settings.companyCity    || process.env.COMPANY_CITY    || "",
      companyEmail:   settings.companyEmail   || process.env.COMPANY_EMAIL   || "",
      companyPhone:   settings.companyPhone   || process.env.COMPANY_PHONE   || "",
      footerText:     settings.invoiceFooter  || null,
    });

    res.set({
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      "Content-Length":      pdf.length,
    });
    res.send(pdf);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// ============================================================
// STATISTICS
// ============================================================

/**
 * GET /admin/billing/invoices/stats
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await invoiceService.getStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};