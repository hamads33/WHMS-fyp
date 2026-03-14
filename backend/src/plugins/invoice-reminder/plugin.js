const InvoiceReminderService = require("./service");
const makeHooks              = require("./hooks");
const buildRouter            = require("./api");

module.exports = {
  meta: {
    name         : "invoice-reminder",
    version      : "1.2.0",
    description  : "Tracks overdue invoices and sends payment reminders automatically via daily cron",
    capabilities : ["hooks", "api", "cron", "billing", "ui"],
    permissions  : ["invoices.read", "customers.read", "notifications.send"],
    ui: {
      adminPages: [
        { id: "overdue", label: "Overdue Invoices", icon: "file-warning" },
      ],
    },
  },

  register(ctx) {
    const { services, hooks, events, config, app, prisma, logger } = ctx;

    // Config
    config.set("graceDays", Number(process.env.INVOICE_REMINDER_GRACE_DAYS) || 3);

    // Service
    const service = new InvoiceReminderService({
      prisma,
      logger,
      graceDays: config.get("graceDays"),
    });
    services.register("invoiceReminder", service);

    // Hooks
    const { onInvoicePaid, onCronDaily } = makeHooks(service, logger);
    hooks.register("invoice.paid", onInvoicePaid, this.meta.name);
    events.on("cron.daily", onCronDaily);

    // API
    if (app) {
      app.use("/api/plugins/invoice-reminder", buildRouter({ service, logger }));
      logger.info("[invoice-reminder] API mounted at /api/plugins/invoice-reminder");
    }

    logger.info("[invoice-reminder] Plugin registered");
  },

  boot(ctx) {
    ctx.logger.info("[invoice-reminder] Plugin booted — tracking overdue invoices");
  },

  shutdown(ctx) {
    ctx.logger.info("[invoice-reminder] Plugin shutting down");
  },
};
