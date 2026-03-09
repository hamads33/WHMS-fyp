/**
 * Recurring Billing Service
 * Path: src/modules/billing/services/recurring-billing.service.js
 * FR-03: Recurring invoice generation for subscriptions
 * Designed to be called by a cron job / scheduler
 */

const prisma = require("../../../../prisma");
const invoiceService = require("./invoice.service");
const { getNextRenewalDate } = require("../utils/billing.util"); // ✅ FIXED: Use new function

class RecurringBillingService {
  /**
   * Process all active orders due for renewal
   * Called by cron job: e.g. daily at midnight
   * 
   * ✅ FIXED: Only update nextRenewalAt on success
   * ✅ FIXED: Track renewal attempt failures
   * ✅ FIXED: Use calendar-based date calculations
   */
  async processRenewals() {
    const now = new Date();
    const results = {
      processed: 0,
      skipped: 0,
      errors: [],
      updated: 0, // ← NEW: Track how many had renewal dates updated
    };

    // Find active orders where nextRenewalAt <= now
    const dueOrders = await prisma.order.findMany({
      where: {
        status: "active",
        nextRenewalAt: { lte: now },
      },
      include: {
        snapshot: true,
        client: { select: { id: true, email: true } },
      },
    });

    for (const order of dueOrders) {
      try {
        // Step 1: Generate invoice
        const invoice = await invoiceService.generateFromOrder(order.id, {
          force: true,
          notes: `Renewal invoice for order ${order.id}`,
        });

        // Step 2: Only update renewal date on SUCCESS
        const cycle = order.snapshot?.snapshot?.pricing?.cycle || "monthly";
        
        // ✅ FIXED: Use calendar-based calculation
        const nextRenewal = getNextRenewalDate(
          order.nextRenewalAt || new Date(),
          cycle
        );

        await prisma.order.update({
          where: { id: order.id },
          data: {
            nextRenewalAt: nextRenewal,
            lastRenewalAt: now,              // ← NEW: Track last successful attempt
            renewalFailedAt: null,            // ← NEW: Clear error on success
            renewalError: null,               // ← NEW: Clear error message
          },
        });

        results.processed++;
        results.updated++;

      } catch (err) {
        // Step 3: On error, DON'T update renewal date
        // This way the job will retry next run
        
        results.errors.push({
          orderId: order.id,
          error: err.message,
          statusCode: err.statusCode,        // ← NEW: For retry logic
          timestamp: now.toISOString(),      // ← NEW: When it failed
          retryable: err.statusCode >= 500,  // ← NEW: Mark if retryable (5xx = server errors)
        });
        results.skipped++;

        // ✅ NEW: Mark order as having failed renewal attempt
        try {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              renewalFailedAt: now,
              renewalError: `${err.message} (${err.statusCode})`,
            },
          });
        } catch (updateErr) {
          console.error(
            `Failed to update order ${order.id} with renewal error`,
            updateErr
          );
        }
      }
    }

    return results;
  }

  /**
   * Preview upcoming renewals (next N days)
   */
  async previewUpcoming(days = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return prisma.order.findMany({
      where: {
        status: "active",
        nextRenewalAt: { gte: now, lte: future },
      },
      include: {
        snapshot: true,
        client: { select: { id: true, email: true } },
      },
      orderBy: { nextRenewalAt: "asc" },
    });
  }

  /**
   * Manually trigger renewal for a single order (admin use)
   * 
   * ✅ FIXED: Use calendar-based date calculations
   */
  async manualRenewal(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { snapshot: true },
    });

    if (!order) {
      const err = new Error("Order not found");
      err.statusCode = 404;
      throw err;
    }

    if (order.status !== "active") {
      const err = new Error("Only active orders can be renewed");
      err.statusCode = 409;
      throw err;
    }

    const invoice = await invoiceService.generateFromOrder(orderId, {
      force: true,
      notes: `Manual renewal for order ${orderId}`,
    });

    const cycle = order.snapshot?.snapshot?.pricing?.cycle || "monthly";
    
    // ✅ FIXED: Use calendar-based calculation
    const nextRenewal = getNextRenewalDate(
      order.nextRenewalAt || new Date(),
      cycle
    );

    const now = new Date();
    await prisma.order.update({
      where: { id: orderId },
      data: {
        nextRenewalAt: nextRenewal,
        lastRenewalAt: now,              // ← NEW: Track manual renewal
        renewalFailedAt: null,
        renewalError: null,
      },
    });

    return { invoice, nextRenewalAt: nextRenewal };
  }
}

module.exports = new RecurringBillingService();