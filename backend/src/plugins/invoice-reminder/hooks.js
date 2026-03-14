/**
 * invoice-reminder/hooks.js
 * Hook handlers injected during register().
 * The service instance is closed over so handlers are stateless functions.
 */

function makeHooks(service, logger) {
  /**
   * invoice.paid
   * Fired by the billing module when a payment is confirmed.
   * Payload: { invoiceId, amount, clientId, paidAt }
   */
  function onInvoicePaid(payload) {
    const id = payload?.invoiceId || payload?.id;
    if (id) {
      service.markPaid(id);
      logger.info(`[invoice-reminder] ✓ Invoice ${id} paid — removed from overdue tracking`);
    }
  }

  /**
   * cron.daily
   * Fired by the system scheduler every day.
   * Scans for overdue invoices and logs/sends reminders.
   */
  async function onCronDaily() {
    logger.info("[invoice-reminder] ⏰ Daily scan for overdue invoices...");

    const overdue = await service.scanOverdue();

    if (!overdue.length) {
      logger.info("[invoice-reminder] ✓ No overdue invoices found");
      return;
    }

    for (const inv of overdue) {
      const level = inv.reminderCount === 0 ? "first"
                  : inv.reminderCount === 1 ? "second"
                  : "final";

      // In a real system: send email/SMS here
      logger.warn(
        `[invoice-reminder] 🔔 Sending ${level} reminder — Invoice ${inv.invoiceId} ` +
        `($${inv.amount}) overdue since ${new Date(inv.dueDate).toLocaleDateString()}`
      );

      service.recordReminder(inv.invoiceId, level);
    }

    logger.info(`[invoice-reminder] Daily scan complete — ${overdue.length} reminder(s) sent`);
  }

  return { onInvoicePaid, onCronDaily };
}

module.exports = makeHooks;
