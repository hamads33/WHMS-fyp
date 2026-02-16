/**
 * Billing Controllers
 * Path: src/modules/billing/controllers/billing.controller.js
 */

const invoiceService = require("../services/invoice.service");
const paymentService = require("../services/payment.service");
const refundService = require("../services/refund.service");
const profileService = require("../services/billing-profile.service");
const taxService = require("../services/tax.service");
const reportService = require("../services/billing-report.service");
const recurringService = require("../services/recurring-billing.service");

// ============================================================
// INVOICE CONTROLLER
// ============================================================

exports.generateFromOrder = async (req, res) => {
  try {
    const invoice = await invoiceService.generateFromOrder(
      req.params.orderId,
      req.body
    );
    res.status(201).json(invoice);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const clientId = req.body.clientId || req.user.id;
    const invoice = await invoiceService.create(clientId, req.body);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    // ✅ FIXED: pass req.user directly — authGuard sets roles[] not role string
    const invoice = await invoiceService.getById(req.params.id, req.user || null);
    res.json(invoice);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.listClientInvoices = async (req, res) => {
  try {
    const invoices = await invoiceService.getClientInvoices(req.user.id, {
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      status: req.query.status,
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminListInvoices = async (req, res) => {
  try {
    const invoices = await invoiceService.adminList({
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      status: req.query.status,
      clientId: req.query.clientId,
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.update(req.params.id, req.body);
    res.json(invoice);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.cancelInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.cancel(req.params.id);
    res.json(invoice);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.applyDiscount = async (req, res) => {
  try {
    const invoice = await invoiceService.applyDiscount(req.params.id, req.body);
    res.json(invoice);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.getOverdueInvoices = async (req, res) => {
  try {
    const invoices = await invoiceService.getOverdue({
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// PAYMENT CONTROLLER
// ============================================================

exports.recordPayment = async (req, res) => {
  try {
    const payment = await paymentService.recordPayment(req.params.invoiceId, req.body);
    res.status(201).json(payment);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.initiateGatewayPayment = async (req, res) => {
  try {
    const result = await paymentService.initiateGatewayPayment(
      req.params.invoiceId,
      req.body
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.gatewayCallback = async (req, res) => {
  try {
    const result = await paymentService.handleGatewayCallback(
      req.params.paymentId,
      req.body
    );
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.getPayment = async (req, res) => {
  try {
    const payment = await paymentService.getById(req.params.id);
    res.json(payment);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.listInvoicePayments = async (req, res) => {
  try {
    const payments = await paymentService.getByInvoiceId(req.params.invoiceId);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listClientPayments = async (req, res) => {
  try {
    const payments = await paymentService.getClientPayments(req.user.id, {
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// REFUND CONTROLLER
// ============================================================

exports.processRefund = async (req, res) => {
  try {
    const refund = await refundService.processRefund(req.params.paymentId, req.body);
    res.status(201).json(refund);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.getRefund = async (req, res) => {
  try {
    const refund = await refundService.getById(req.params.id);
    res.json(refund);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.listPaymentRefunds = async (req, res) => {
  try {
    const refunds = await refundService.getByPaymentId(req.params.paymentId);
    res.json(refunds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// BILLING PROFILE CONTROLLER
// ============================================================

exports.getMyProfile = async (req, res) => {
  try {
    const profile = await profileService.getOrCreate(req.user.id);
    res.json(profile);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const profile = await profileService.update(req.user.id, req.body);
    res.json(profile);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.adminListProfiles = async (req, res) => {
  try {
    const profiles = await profileService.listAll({
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminGetProfile = async (req, res) => {
  try {
    const profile = await profileService.getByClientId(req.params.clientId);
    res.json(profile);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.adminUpdateProfile = async (req, res) => {
  try {
    const profile = await profileService.update(req.params.clientId, req.body);
    res.json(profile);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

// ============================================================
// TAX CONTROLLER
// ============================================================

exports.listTaxRules = async (req, res) => {
  try {
    const rules = await taxService.listAll();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTaxRule = async (req, res) => {
  try {
    const rule = await taxService.create(req.body);
    res.status(201).json(rule);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.updateTaxRule = async (req, res) => {
  try {
    const rule = await taxService.update(parseInt(req.params.id), req.body);
    res.json(rule);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.deleteTaxRule = async (req, res) => {
  try {
    await taxService.delete(parseInt(req.params.id));
    res.status(204).send();
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

// ============================================================
// REPORTING CONTROLLER
// ============================================================

exports.getRevenueSummary = async (req, res) => {
  try {
    const summary = await reportService.getRevenueSummary({
      from: req.query.from,
      to: req.query.to,
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClientSummary = async (req, res) => {
  try {
    const clientId = req.params.clientId || req.user.id;
    const summary = await reportService.getClientSummary(clientId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOutstandingBalances = async (req, res) => {
  try {
    const data = await reportService.getOutstandingBalances({
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const data = await reportService.getPaymentHistory({
      clientId: req.query.clientId,
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlyRevenue = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const data = await reportService.getMonthlyRevenue(year);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTransactionLog = async (req, res) => {
  try {
    const data = await reportService.getTransactionLog({
      clientId: req.query.clientId,
      invoiceId: req.query.invoiceId,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// RECURRING BILLING CONTROLLER
// ============================================================

exports.previewRenewals = async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 7;
    const data = await recurringService.previewUpcoming(days);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.manualRenewal = async (req, res) => {
  try {
    const result = await recurringService.manualRenewal(req.params.orderId);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.processRenewals = async (req, res) => {
  try {
    const result = await recurringService.processRenewals();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};