/**
 * Recurring Billing Service
 * Path: src/modules/billing/services/recurring-billing.service.js
 * FR-03: Recurring invoice generation for subscriptions
 * Designed to be called by a cron job / scheduler
 */

const prisma = require("../../../../prisma");
const invoiceService = require("./invoice.service");
const { cycleToDays } = require("../utils/billing.util");

class RecurringBillingService {
  /**
   * Process all active orders due for renewal
   * Called by cron job: e.g. daily at midnight
   */
  async processRenewals() {
    const now = new Date();
    const results = { processed: 0, skipped: 0, errors: [] };

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
        // Generate renewal invoice
        const invoice = await invoiceService.generateFromOrder(order.id, {
          force: true,
          notes: `Renewal invoice for order ${order.id}`,
        });

        // Advance nextRenewalAt by billing cycle
        const cycle = order.snapshot?.snapshot?.pricing?.cycle || "monthly";
        const days = cycleToDays(cycle);
        const nextRenewal = new Date(order.nextRenewalAt);
        nextRenewal.setDate(nextRenewal.getDate() + days);

        await prisma.order.update({
          where: { id: order.id },
          data: { nextRenewalAt: nextRenewal },
        });

        results.processed++;
      } catch (err) {
        results.errors.push({ orderId: order.id, error: err.message });
        results.skipped++;
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
    const days = cycleToDays(cycle);
    const base = order.nextRenewalAt || new Date();
    const nextRenewal = new Date(base);
    nextRenewal.setDate(nextRenewal.getDate() + days);

    await prisma.order.update({
      where: { id: orderId },
      data: { nextRenewalAt: nextRenewal },
    });

    return { invoice, nextRenewalAt: nextRenewal };
  }
}

module.exports = new RecurringBillingService();