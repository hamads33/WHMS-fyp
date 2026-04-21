/**
 * Billing Service (Orchestrator)
 * Path: src/modules/billing/services/billing.service.js
 *
 * The core billing orchestrator. Reads order snapshots to build
 * invoices automatically — line items, setup fees, add-ons, taxes,
 * discounts. Also drives renewal, suspension, and termination billing.
 *
 * Depends on:
 *   invoice.service.js  — invoice CRUD
 *   tax.service.js      — tax resolution
 *   payment.service.js  — payment recording (via controller)
 */

const prisma = require("../../../../prisma");
const invoiceService = require("./invoice.service");
const taxService = require("./tax.service");
const {
  toCurrency,
  getCycleLabel,
  calculateDueDate,
  isDueForRenewal,
} = require("../utils/billing.util");
const provisioningHooks = require("../../provisioning/utils/provisioning-hooks");
const emailTriggers = require("../../email/triggers/email.triggers");

// ============================================================
// INVOICE TYPE CONSTANTS
// ============================================================

const INVOICE_TYPES = {
  NEW_ORDER: "new_order",
  RENEWAL: "renewal",
  SUSPENSION: "suspension",
  TERMINATION: "termination",
  MANUAL: "manual",
};

class BillingService {
  // ============================================================
  // INVOICE GENERATION FROM ORDERS
  // ============================================================

  /**
   * Generate an invoice for a new order.
   * Reads the order snapshot and builds:
   *   - Plan subscription line item (base price × billingCycles)
   *   - Setup fee line item (if > 0)
   *   - Add-on line items (price × quantity)
   *   - Add-on setup fees
   *   - Snapshot-level discount
   *   - Tax (resolved from client billing profile)
   *
   * @param {string} orderId
   * @param {Object} [options]
   * @param {number} [options.billingCycles=1] - Number of cycles to bill upfront
   * @param {number} [options.dueDays=7] - Payment terms
   * @param {string} [options.status="unpaid"] - draft | unpaid
   * @param {string} actor - Acting user ID
   * @returns {Object} Invoice
   */
  async generateInvoiceFromOrder(orderId, options = {}, actor) {
    const { billingCycles = 1, dueDays = 7, status = "unpaid" } = options;

    const order = await this._fetchOrderWithSnapshot(orderId);
    const snapshot = order.snapshot;

    this._assertSnapshot(snapshot, orderId);

    // Validate no invoice already exists for this order (first invoice)
    const existing = await prisma.invoice.findFirst({
      where: {
        orderId,
        status: { notIn: ["cancelled"] },
      },
    });

    if (existing) {
      const err = new Error(
        `An active invoice already exists for order ${orderId} (${existing.invoiceNumber}). Use generateRenewalInvoice() for renewals.`
      );
      err.statusCode = 409;
      throw err;
    }

    const pricing = snapshot.pricing;
    const addons = snapshot.addons || [];
    const service = snapshot.service;
    const plan = snapshot.planData;

    // Resolve billing profile for tax
    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: order.clientId },
    });

    const currency = pricing.currency || "USD";
    const cycleLabel = getCycleLabel(pricing.cycle);

    // --------------------------------------------------------
    // Build line items
    // --------------------------------------------------------
    const lineItems = [];

    // 1. Plan subscription (base price)
    const basePrice = toCurrency(parseFloat(pricing.price) * billingCycles);

    // Resolve tax for plan
    const planTax = await taxService.calculate(
      basePrice,
      order.clientId,
      service.moduleType || null
    );

    lineItems.push({
      description: `${service.name} — ${plan.name} (${cycleLabel})${billingCycles > 1 ? ` × ${billingCycles}` : ""}`,
      quantity: billingCycles,
      unitPrice: toCurrency(pricing.price),
      taxRate: planTax.taxRate || null,
      serviceCode: service.code,
      planName: plan.name,
      cycle: pricing.cycle,
    });

    // 2. Setup fee (one-time, only for first invoice)
    const setupFee = parseFloat(pricing.setupFee || 0);
    if (setupFee > 0) {
      lineItems.push({
        description: `Setup Fee — ${service.name} (${plan.name})`,
        quantity: 1,
        unitPrice: setupFee,
        taxRate: null,
        serviceCode: service.code,
        planName: plan.name,
        cycle: null,
      });
    }

    // 3. Add-on line items
    for (const addon of addons) {
      const addonPrice = toCurrency(parseFloat(addon.price || 0));
      const addonQty = addon.quantity || 1;

      if (addonPrice > 0) {
        const addonTax = await taxService.calculate(
          toCurrency(addonPrice * addonQty),
          order.clientId,
          null
        );

        lineItems.push({
          description: `Add-on: ${addon.name} (${cycleLabel})`,
          quantity: addonQty,
          unitPrice: addonPrice,
          taxRate: addonTax.taxRate || null,
          serviceCode: addon.code || null,
          planName: null,
          cycle: pricing.cycle,
        });
      }

      // 4. Add-on setup fee
      const addonSetupFee = parseFloat(addon.setupFee || 0);
      if (addonSetupFee > 0) {
        lineItems.push({
          description: `Setup Fee — ${addon.name}`,
          quantity: addonQty,
          unitPrice: addonSetupFee,
          taxRate: null,
          serviceCode: addon.code || null,
          planName: null,
          cycle: null,
        });
      }
    }

    // --------------------------------------------------------
    // Build discounts (from snapshot pricing)
    // --------------------------------------------------------
    const discounts = [];

    if (pricing.discountType && parseFloat(pricing.discountAmount || 0) > 0) {
      discounts.push({
        type: "promo",
        description: `Plan discount (${pricing.discountType})`,
        amount: parseFloat(pricing.discountAmount),
        isPercent: pricing.discountType === "percentage",
      });
    }

    // --------------------------------------------------------
    // Create invoice
    // --------------------------------------------------------
    const invoice = await invoiceService.create({
      clientId: order.clientId,
      orderId,
      billingProfileId: billingProfile?.id || null,
      currency,
      lineItems,
      discounts,
      dueDays,
      status,
      notes: null,
      metadata: {
        type: INVOICE_TYPES.NEW_ORDER,
        snapshotId: snapshot.id,
        cycle: pricing.cycle,
        billingCycles,
      },
    });

    return invoice;
  }

  /**
   * Generate a renewal invoice for an active order.
   * Uses renewalPrice if set, otherwise falls back to price.
   *
   * @param {string} orderId
   * @param {Object} [options]
   * @param {number} [options.dueDays=3]
   * @param {string} [options.status="unpaid"]
   * @param {string} actor
   */
  async generateRenewalInvoice(orderId, options = {}, actor) {
    const { dueDays = 3, status = "unpaid" } = options;

    const order = await this._fetchOrderWithSnapshot(orderId);
    const snapshot = order.snapshot;

    this._assertSnapshot(snapshot, orderId);

    if (order.status !== "active") {
      const err = new Error(
        `Cannot generate renewal invoice for order with status: ${order.status}`
      );
      err.statusCode = 409;
      throw err;
    }

    const pricing = snapshot.pricing;
    const service = snapshot.service;
    const plan = snapshot.planData;
    const addons = snapshot.addons || [];
    const cycleLabel = getCycleLabel(pricing.cycle);

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: order.clientId },
    });

    // Use renewalPrice if set, otherwise use price
    const renewalUnitPrice = toCurrency(
      parseFloat(pricing.renewalPrice || pricing.price)
    );

    const planTax = await taxService.calculate(
      renewalUnitPrice,
      order.clientId,
      service.moduleType || null
    );

    const lineItems = [
      {
        description: `${service.name} — ${plan.name} Renewal (${cycleLabel})`,
        quantity: 1,
        unitPrice: renewalUnitPrice,
        taxRate: planTax.taxRate || null,
        serviceCode: service.code,
        planName: plan.name,
        cycle: pricing.cycle,
      },
    ];

    // Renew add-ons too
    for (const addon of addons) {
      const addonPrice = toCurrency(
        parseFloat(addon.renewalPrice || addon.price || 0)
      );
      if (addonPrice > 0) {
        lineItems.push({
          description: `Add-on Renewal: ${addon.name} (${cycleLabel})`,
          quantity: addon.quantity || 1,
          unitPrice: addonPrice,
          taxRate: null,
          serviceCode: addon.code || null,
          planName: null,
          cycle: pricing.cycle,
        });
      }
    }

    return invoiceService.create({
      clientId: order.clientId,
      orderId,
      billingProfileId: billingProfile?.id || null,
      currency: pricing.currency || "USD",
      lineItems,
      discounts: [],
      dueDays,
      status,
      notes: `Renewal for order ${orderId}`,
      metadata: {
        type: INVOICE_TYPES.RENEWAL,
        snapshotId: snapshot.id,
        cycle: pricing.cycle,
        renewalDate: order.nextRenewalAt,
      },
    });
  }

  /**
   * Generate a suspension fee invoice.
   * Only created if the plan has a suspensionFee > 0.
   *
   * @param {string} orderId
   * @param {string} [reason]
   * @param {string} actor
   */
  async generateSuspensionInvoice(orderId, reason, actor) {
    const order = await this._fetchOrderWithSnapshot(orderId);
    const snapshot = order.snapshot;

    this._assertSnapshot(snapshot, orderId);

    const suspensionFee = parseFloat(snapshot.pricing?.suspensionFee || 0);

    if (suspensionFee <= 0) {
      return null; // No fee configured — nothing to invoice
    }

    const service = snapshot.service;
    const plan = snapshot.planData;
    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: order.clientId },
    });

    const lineItems = [
      {
        description: `Service Suspension Fee — ${service.name} (${plan.name})${reason ? `: ${reason}` : ""}`,
        quantity: 1,
        unitPrice: suspensionFee,
        taxRate: null,
        serviceCode: service.code,
        planName: plan.name,
        cycle: null,
      },
    ];

    return invoiceService.create({
      clientId: order.clientId,
      orderId,
      billingProfileId: billingProfile?.id || null,
      currency: snapshot.pricing?.currency || "USD",
      lineItems,
      discounts: [],
      dueDays: 3,
      status: "unpaid",
      notes: reason || null,
      metadata: {
        type: INVOICE_TYPES.SUSPENSION,
        snapshotId: snapshot.id,
        reason,
      },
    });
  }

  /**
   * Generate a termination fee invoice.
   * Only created if the plan has a terminationFee > 0.
   *
   * @param {string} orderId
   * @param {string} [reason]
   * @param {string} actor
   */
  async generateTerminationInvoice(orderId, reason, actor) {
    const order = await this._fetchOrderWithSnapshot(orderId);
    const snapshot = order.snapshot;

    this._assertSnapshot(snapshot, orderId);

    const terminationFee = parseFloat(snapshot.pricing?.terminationFee || 0);

    if (terminationFee <= 0) {
      return null; // No fee configured
    }

    const service = snapshot.service;
    const plan = snapshot.planData;
    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: order.clientId },
    });

    const lineItems = [
      {
        description: `Service Termination Fee — ${service.name} (${plan.name})${reason ? `: ${reason}` : ""}`,
        quantity: 1,
        unitPrice: terminationFee,
        taxRate: null,
        serviceCode: service.code,
        planName: plan.name,
        cycle: null,
      },
    ];

    return invoiceService.create({
      clientId: order.clientId,
      orderId,
      billingProfileId: billingProfile?.id || null,
      currency: snapshot.pricing?.currency || "USD",
      lineItems,
      discounts: [],
      dueDays: 7,
      status: "unpaid",
      notes: reason || null,
      metadata: {
        type: INVOICE_TYPES.TERMINATION,
        snapshotId: snapshot.id,
        reason,
      },
    });
  }

  /**
   * Create a manual invoice not tied to an order.
   *
   * @param {Object} data
   * @param {string} data.clientId
   * @param {string} [data.currency]
   * @param {Array} data.lineItems
   * @param {Array} [data.discounts]
   * @param {number} [data.dueDays]
   * @param {string} [data.notes]
   * @param {string} actor
   */
  async createManualInvoice(data, actor) {
    const clientExists = await prisma.user.findUnique({
      where: { id: data.clientId },
      select: { id: true },
    });

    if (!clientExists) {
      const err = new Error("Client not found");
      err.statusCode = 404;
      throw err;
    }

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: data.clientId },
    });

    return invoiceService.create({
      clientId: data.clientId,
      orderId: null,
      billingProfileId: billingProfile?.id || null,
      currency: data.currency || "USD",
      lineItems: data.lineItems,
      discounts: data.discounts || [],
      dueDays: data.dueDays || 7,
      status: data.status || "draft",
      notes: data.notes || null,
      metadata: { type: INVOICE_TYPES.MANUAL },
    });
  }

  // ============================================================
  // RENEWAL PROCESSING (Batch / Scheduled Jobs)
  // ============================================================

  /**
   * Find orders due for renewal and generate invoices.
   * Intended to be called by a cron job (e.g. daily at midnight).
   *
   * @param {number} [daysAhead=3] - Generate invoices for orders renewing within N days
   * @returns {{ processed: number, errors: Array }}
   */
  async processDueRenewals(daysAhead = 3) {
    const window = new Date();
    window.setDate(window.getDate() + daysAhead);

    const orders = await prisma.order.findMany({
      where: {
        status: "active",
        nextRenewalAt: { lte: window },
        // Only process orders that don't already have a pending renewal invoice
        invoices: {
          none: {
            status: { in: ["unpaid", "overdue", "draft"] },
            metadata: { path: ["type"], equals: INVOICE_TYPES.RENEWAL },
          },
        },
      },
      include: { snapshot: true },
      take: 200, // Batch limit
    });

    const results = { processed: 0, errors: [] };

    for (const order of orders) {
      try {
        await this.generateRenewalInvoice(order.id, { status: "unpaid" }, "system");
        results.processed++;
      } catch (err) {
        results.errors.push({ orderId: order.id, error: err.message });
      }
    }

    return results;
  }

  /**
   * Mark overdue invoices and optionally suspend their orders.
   *
   * @param {boolean} [autoSuspend=false] - Suspend orders with overdue invoices
   * @returns {{ markedOverdue: number, suspended: number }}
   */
  async processOverdueInvoices(autoSuspend = false) {
    const overdueList = await invoiceService.getOverdue();
    const results = { markedOverdue: 0, suspended: 0 };

    for (const invoice of overdueList) {
      try {
        await invoiceService.markOverdue(invoice.id);
        results.markedOverdue++;

        // Fetch full invoice with client for email trigger
        const fullInvoice = await prisma.invoice.findUnique({
          where: { id: invoice.id },
          include: { client: true },
        });

        // Fire overdue notification email
        if (fullInvoice && fullInvoice.client) {
          try {
            const daysOverdue = Math.floor(
              (Date.now() - new Date(fullInvoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            await emailTriggers.fire('billing.payment_overdue', {
              clientEmail: fullInvoice.client.email,
              clientName: fullInvoice.client.name,
              invoiceId: fullInvoice.invoiceNumber,
              invoiceTotal: fullInvoice.total,
              dueDate: fullInvoice.dueDate,
              daysOverdue: Math.max(0, daysOverdue),
              invoiceUrl: `${process.env.PORTAL_URL || 'https://portal.whms.local'}/invoices/${fullInvoice.id}`,
              supportEmail: process.env.SUPPORT_EMAIL || 'support@whms.local',
            });
          } catch (emailErr) {
            console.error(`Failed to send overdue email for invoice ${invoice.id}:`, emailErr.message);
          }
        }

        if (autoSuspend && invoice.orderId) {
          // Check order isn't already suspended
          const order = await prisma.order.findUnique({
            where: { id: invoice.orderId },
            select: { status: true },
          });

          if (order?.status === "active") {
            await prisma.order.update({
              where: { id: invoice.orderId },
              data: { status: "suspended", suspendedAt: new Date() },
            });
            results.suspended++;
            // Suspend hosting account
            await provisioningHooks.onInvoiceOverdue(invoice.id, invoice.orderId);
          }
        }
      } catch (err) {
        console.error(`Failed to process overdue invoice ${invoice.id}:`, err.message);
      }
    }

    return results;
  }

  // ============================================================
  // CLIENT BILLING SUMMARY
  // ============================================================

  /**
   * Get full billing summary for a client.
   *
   * @param {string} clientId
   * @returns {{ profile, invoiceSummary, paymentSummary, outstandingBalance }}
   */
  async getClientBillingSummary(clientId) {
    const [profile, invoiceAgg, payments] = await Promise.all([
      prisma.billingProfile.findUnique({ where: { clientId } }),
      prisma.invoice.aggregate({
        where: { clientId },
        _count: { id: true },
        _sum: { totalAmount: true, amountPaid: true, amountDue: true },
      }),
      prisma.payment.aggregate({
        where: { clientId, status: "completed" },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const [unpaidCount, overdueCount] = await Promise.all([
      prisma.invoice.count({ where: { clientId, status: "unpaid" } }),
      prisma.invoice.count({ where: { clientId, status: "overdue" } }),
    ]);

    return {
      profile,
      invoiceSummary: {
        total: invoiceAgg._count.id,
        totalBilled: toCurrency(invoiceAgg._sum.totalAmount || 0),
        totalPaid: toCurrency(invoiceAgg._sum.amountPaid || 0),
        outstandingBalance: toCurrency(invoiceAgg._sum.amountDue || 0),
        unpaidCount,
        overdueCount,
      },
      paymentSummary: {
        totalPayments: payments._count.id,
        totalPaid: toCurrency(payments._sum.amount || 0),
      },
    };
  }

  // ============================================================
  // BILLING PROFILE MANAGEMENT
  // ============================================================

  /**
   * Create or update a client billing profile.
   * @param {string} clientId
   * @param {Object} data
   */
  async upsertBillingProfile(clientId, data) {
    const user = await prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!user) {
      const err = new Error("Client not found");
      err.statusCode = 404;
      throw err;
    }

    return prisma.billingProfile.upsert({
      where: { clientId },
      update: {
        currency: data.currency,
        billingAddress: data.billingAddress,
        city: data.city,
        country: data.country,
        postalCode: data.postalCode,
        taxId: data.taxId,
        paymentMethodRef: data.paymentMethodRef,
      },
      create: {
        clientId,
        currency: data.currency || "USD",
        billingAddress: data.billingAddress || null,
        city: data.city || null,
        country: data.country || null,
        postalCode: data.postalCode || null,
        taxId: data.taxId || null,
        paymentMethodRef: data.paymentMethodRef || null,
      },
    });
  }

  /**
   * Get billing profile for a client.
   * @param {string} clientId
   */
  async getBillingProfile(clientId) {
    const profile = await prisma.billingProfile.findUnique({
      where: { clientId },
    });

    if (!profile) {
      const err = new Error("Billing profile not found");
      err.statusCode = 404;
      throw err;
    }

    return profile;
  }

  // ============================================================
  // ADMIN STATISTICS
  // ============================================================

  /**
   * Revenue overview for admin dashboard.
   */
  async getRevenueStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [monthly, yearly, allTime] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: "paid", paidAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: { status: "paid", paidAt: { gte: startOfYear } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: { status: "paid" },
        _sum: { totalAmount: true, taxAmount: true },
        _count: { id: true },
      }),
    ]);

    return {
      monthly: {
        revenue: toCurrency(monthly._sum.totalAmount || 0),
        invoices: monthly._count.id,
      },
      yearly: {
        revenue: toCurrency(yearly._sum.totalAmount || 0),
        invoices: yearly._count.id,
      },
      allTime: {
        revenue: toCurrency(allTime._sum.totalAmount || 0),
        taxCollected: toCurrency(allTime._sum.taxAmount || 0),
        invoices: allTime._count.id,
      },
    };
  }

  /**
   * Get revenue by month for the past N months.
   * Returns data for the last N months including current month.
   *
   * @param {number} months - Number of months to retrieve (default 6)
   * @returns {Array} Array of { month, revenue, invoices }
   */
  async getRevenueByMonth(months = 6) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Query all paid invoices from the past N months
    const invoices = await prisma.invoice.findMany({
      where: {
        status: "paid",
        paidAt: { gte: startDate },
      },
      select: {
        paidAt: true,
        totalAmount: true,
      },
    });

    // Group by month
    const monthlyData = {};
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      monthlyData[monthKey] = { revenue: 0, invoices: 0 };
    }

    // Aggregate invoices by month
    invoices.forEach((invoice) => {
      const monthKey = invoice.paidAt.toISOString().slice(0, 7);
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenue += Number(invoice.totalAmount);
        monthlyData[monthKey].invoices += 1;
      }
    });

    // Convert to array and format
    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      revenue: toCurrency(data.revenue),
      invoices: data.invoices,
    }));
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  async _fetchOrderWithSnapshot(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { snapshot: true },
    });

    if (!order) {
      const err = new Error("Order not found");
      err.statusCode = 404;
      throw err;
    }

    return order;
  }

  _assertSnapshot(snapshot, orderId) {
    if (!snapshot) {
      const err = new Error(`Order ${orderId} has no snapshot`);
      err.statusCode = 400;
      throw err;
    }

    if (!snapshot.pricing || !snapshot.service || !snapshot.planData) {
      const err = new Error(
        `Order ${orderId} snapshot is missing required fields (pricing, service, planData)`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // ============================================================
  // LATE FEES
  // ============================================================

  /**
   * Apply a late fee to an overdue invoice.
   * Uses system settings: lateFeeType (Percentage|Fixed), lateFeeAmount, lateFeeMinimum.
   *
   * @param {string} invoiceId
   * @param {Object} settings - { lateFeeType, lateFeeAmount, lateFeeMinimum }
   * @returns {Object} updated invoice
   */
  async applyLateFee(invoiceId, settings = {}) {
    const invoice = await invoiceService.getById(invoiceId, false);

    if (!["overdue", "unpaid"].includes(invoice.status)) {
      const err = new Error("Late fees can only be applied to overdue or unpaid invoices");
      err.statusCode = 400;
      throw err;
    }

    const base      = parseFloat(invoice.amountDue);
    const feeType   = settings.lateFeeType   || "Percentage";
    const feeAmt    = parseFloat(settings.lateFeeAmount  || 10);
    const feeMin    = parseFloat(settings.lateFeeMinimum || 0);

    let feeValue = feeType === "Percentage"
      ? toCurrency(base * (feeAmt / 100))
      : toCurrency(feeAmt);

    if (feeMin > 0 && feeValue < feeMin) feeValue = toCurrency(feeMin);
    if (feeValue <= 0) return invoice;

    return invoiceService.applyDiscount(invoiceId, {
      type:        "manual",
      description: `Late fee (${feeType === "Percentage" ? `${feeAmt}%` : `$${feeAmt}`})`,
      amount:      -feeValue,  // negative discount = charge
      isPercent:   false,
    });
  }

  /**
   * Run late fee job: apply late fees to all overdue invoices that haven't had one applied.
   */
  async processLateFees(settings = {}) {
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "overdue",
        discounts: { none: { description: { startsWith: "Late fee" } } },
      },
      select: { id: true },
    });

    const results = { processed: 0, errors: [] };
    for (const inv of overdueInvoices) {
      try {
        await this.applyLateFee(inv.id, settings);
        results.processed++;
      } catch (err) {
        results.errors.push({ invoiceId: inv.id, error: err.message });
      }
    }
    return results;
  }
}

module.exports = new BillingService();
module.exports.INVOICE_TYPES = INVOICE_TYPES;