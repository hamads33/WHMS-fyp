/**
 * Billing Module
 * Path: src/modules/billing/index.js
 *
 * Mount in your main app:
 *   const billing = require('./modules/billing');
 *   app.use('/api/admin/billing', adminAuth, billing.adminRoutes);
 *   app.use('/api/client/billing', billing.clientRoutes);
 *
 *   // Start cron jobs on boot:
 *   billing.scheduleBillingJobs();
 */

const adminRoutes = require("./routes/admin.billing.routes");
const clientRoutes = require("./routes/client.billing.routes");
const { scheduleBillingJobs } = require("./jobs/billing.cron");

const invoiceService = require("./services/invoice.service");
const paymentService = require("./services/payment.service");
const refundService = require("./services/refund.service");
const profileService = require("./services/billing-profile.service");
const taxService = require("./services/tax.service");
const recurringService = require("./services/recurring-billing.service");
const reportService = require("./services/billing-report.service");

module.exports = {
  // Routes
  adminRoutes,
  clientRoutes,

  // Services (for use in other modules)
  services: {
    invoiceService,
    paymentService,
    refundService,
    profileService,
    taxService,
    recurringService,
    reportService,
  },

  // Cron scheduler
  scheduleBillingJobs,
};