/**
 * Billing Module
 * Path: src/modules/billing/index.js
 *
 * Public interface for the billing module.
 * Import services directly when integrating with other modules
 * (e.g. order module calling billingService.generateInvoiceFromOrder).
 */

// Routes
const adminRoutes = require("./routes/admin.billing.routes");
const clientRoutes = require("./routes/client.billing.routes");
const { webhookRouter } = require("./routes/client.billing.routes");

// Services
const billingService = require("./services/billing.service");
const invoiceService = require("./services/invoice.service");
const paymentService = require("./services/payment.service");
const taxService = require("./services/tax.service");

// Utils
const billingUtil = require("./utils/billing.util");

// DTOs
const dtos = require("./dtos");

module.exports = {
  // ---- Routes ----
  adminRoutes,
  clientRoutes,
  webhookRouter,

  // ---- Services (for cross-module use) ----
  services: {
    billingService,
    invoiceService,
    paymentService,
    taxService,
  },

  // ---- Utils ----
  utils: billingUtil,

  // ---- DTOs ----
  dtos,
};