/**
 * billing-core/plugin.js
 *
 * Core billing plugin — wraps the billing module so it participates
 * in the plugin lifecycle (service container, hooks, cron).
 *
 * Routes mounted:
 *   /api/admin/billing      — invoice, payment, tax, and revenue management
 *   /api/client/billing     — client invoice and payment portal
 *   /api/billing/webhooks   — deprecated stub (returns 410)
 *
 * Services registered in container:
 *   billing:billing   — BillingService  (invoice generation, renewals)
 *   billing:invoice   — InvoiceService  (CRUD + lifecycle)
 *   billing:payment   — PaymentService  (recording, gateway delegation)
 *   billing:tax       — TaxService      (tax rule resolution)
 *
 * Hooks fired (via payment.service.js):
 *   invoice.paid      — when an invoice is fully settled
 */

const billing = require("../../modules/billing");
const { scheduleBillingJobs } = require("../../modules/billing/jobs/billing.cron");
const authGuard = require("../../modules/auth/middlewares/auth.guard");
const adminPortalGuard = require("../../modules/auth/guards/adminPortal.guard");

module.exports = {
  meta: {
    name        : "billing-core",
    version     : "1.0.0",
    description : "Core billing engine — invoices, payments, tax, and renewal scheduling",
    capabilities: ["billing", "api", "cron", "hooks"],
  },

  register(ctx) {
    const { services, app, logger } = ctx;

    // Expose billing services so other plugins (e.g. domain-registrar)
    // can call them without hard-coded require paths.
    services.register("billing:billing", billing.services.billingService);
    services.register("billing:invoice",  billing.services.invoiceService);
    services.register("billing:payment",  billing.services.paymentService);
    services.register("billing:tax",      billing.services.taxService);

    if (app) {
      app.use("/api/admin/billing", authGuard, adminPortalGuard, billing.adminRoutes);
      app.use("/api/client/billing", billing.clientRoutes);
      app.use("/api/billing/webhooks", billing.webhookRouter);
      logger.info("[billing-core] Routes mounted at /api/admin/billing, /api/client/billing");
    }

    logger.info("[billing-core] Plugin registered");
  },

  boot(ctx) {
    scheduleBillingJobs();
    ctx.logger.info("[billing-core] Cron jobs scheduled (overdue check: hourly, renewals: daily 01:00 UTC)");
  },

  shutdown(ctx) {
    ctx.logger.info("[billing-core] Plugin shutting down");
  },
};
