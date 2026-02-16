/**
 * Billing Cron Jobs
 * Path: src/modules/billing/jobs/billing.cron.js
 * FR-03: Recurring billing automation
 * FR-14: Due date and overdue management
 * FR-13: Notification triggers
 *
 * Usage: call scheduleBillingJobs() once on app startup
 * Requires: node-cron  →  npm install node-cron
 */

const cron = require("node-cron");
const recurringService = require("../services/recurring-billing.service");
const invoiceService = require("../services/invoice.service");

/**
 * Emit a billing event for external notification services (FR-13)
 * Replace this with your actual event emitter / webhook dispatcher
 */
function emitBillingEvent(event, payload) {
  // TODO: hook into your existing Webhook / notification system
  // e.g. webhookService.dispatch(event, payload)
  console.log(`[BILLING EVENT] ${event}`, JSON.stringify(payload));
}

/**
 * JOB 1: Mark overdue invoices (runs every hour)
 * FR-14: Automatically mark unpaid invoices as overdue
 */
function scheduleOverdueJob() {
  cron.schedule("0 * * * *", async () => {
    console.log("[BILLING CRON] Running overdue check...");
    try {
      const result = await invoiceService.markOverdue();
      if (result.count > 0) {
        console.log(`[BILLING CRON] Marked ${result.count} invoices as overdue`);
        emitBillingEvent("billing.invoices.overdue", { count: result.count });
      }
    } catch (err) {
      console.error("[BILLING CRON] Overdue job failed:", err.message);
    }
  });
}

/**
 * JOB 2: Process recurring renewals (runs daily at 01:00 UTC)
 * FR-03: Generate renewal invoices for active orders
 */
function scheduleRenewalJob() {
  cron.schedule("0 1 * * *", async () => {
    console.log("[BILLING CRON] Running renewal processing...");
    try {
      const result = await recurringService.processRenewals();
      console.log(
        `[BILLING CRON] Renewals: ${result.processed} processed, ${result.skipped} skipped`
      );

      if (result.processed > 0) {
        emitBillingEvent("billing.renewals.processed", {
          processed: result.processed,
          skipped: result.skipped,
          errors: result.errors,
        });
      }

      if (result.errors.length > 0) {
        console.error("[BILLING CRON] Renewal errors:", result.errors);
      }
    } catch (err) {
      console.error("[BILLING CRON] Renewal job failed:", err.message);
    }
  });
}

/**
 * Schedule all billing cron jobs
 * Call this once during app bootstrap
 */
function scheduleBillingJobs() {
  scheduleOverdueJob();
  scheduleRenewalJob();
  console.log("[BILLING CRON] All billing jobs scheduled");
}

module.exports = { scheduleBillingJobs, emitBillingEvent };