/**
 * Invoice Service
 * Path: src/modules/billing/services/invoice.service.js
 *
 * Manages invoice lifecycle: creation, status transitions, line items,
 * discounts, and queries. Pure invoice CRUD — billing orchestration
 * lives in billing.service.js.
 */

const prisma = require("../../../../prisma");
const { toCurrency, calculateDueDate, getInvoicePrefix } = require("../utils/billing.util");

class InvoiceService {
  // ============================================================
  // INVOICE NUMBER
  // ============================================================

  /**
   * Generate a unique sequential invoice number: INV-YYYY-NNNNN
   * Scoped per calendar year.
   */
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const prefix = getInvoicePrefix(year);

    const count = await prisma.invoice.count({
      where: { invoiceNumber: { startsWith: prefix } },
    });

    return `${prefix}${String(count + 1).padStart(5, "0")}`;
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Create a new invoice with line items.
   * Calculates subtotal, tax, discounts, and totals automatically.
   *
   * @param {Object} data
   * @param {string} data.clientId
   * @param {string|null} data.orderId
   * @param {string|null} data.billingProfileId
   * @param {string} data.currency
   * @param {Array} data.lineItems - [{ description, quantity, unitPrice, taxRate?, serviceCode?, planName?, cycle? }]
   * @param {Array} data.discounts - [{ type, code?, description?, amount, isPercent }]
   * @param {number} data.dueDays - Payment terms in days (default: 7)
   * @param {string|null} data.notes
   * @param {Object|null} data.metadata
   * @param {string} data.status - "draft" | "unpaid" (default: "draft")
   */
  async create(data) {
    const invoiceNumber = await this.generateInvoiceNumber();
    const now = new Date();
    const dueDate = calculateDueDate(now, data.dueDays ?? 7);

    // Build line items with computed totals
    const lineItems = (data.lineItems || []).map((item) => {
      const quantity = item.quantity || 1;
      const unitPrice = toCurrency(item.unitPrice);
      const total = toCurrency(unitPrice * quantity);
      const taxAmount = item.taxRate
        ? toCurrency(total * parseFloat(item.taxRate))
        : null;

      return {
        description: item.description,
        quantity,
        unitPrice,
        total,
        taxRate: item.taxRate || null,
        taxAmount,
        serviceCode: item.serviceCode || null,
        planName: item.planName || null,
        cycle: item.cycle || null,
      };
    });

    // Subtotal = sum of all line item totals
    const subtotal = toCurrency(lineItems.reduce((s, li) => s + li.total, 0));

    // Tax = sum of line item tax amounts
    const taxAmount = toCurrency(
      lineItems.reduce((s, li) => s + (li.taxAmount || 0), 0)
    );

    // Discount calculation
    let discountAmount = 0;
    const discountRows = (data.discounts || []).map((d) => {
      let amt = toCurrency(d.amount);
      if (d.isPercent) {
        amt = toCurrency((subtotal * Math.min(d.amount, 100)) / 100);
      }
      discountAmount += amt;
      return { ...d, amount: amt };
    });
    discountAmount = toCurrency(discountAmount);

    const totalAmount = toCurrency(
      Math.max(0, subtotal + taxAmount - discountAmount)
    );
    const amountDue = totalAmount; // no payments yet

    const status = data.status || "draft";
    const issuedAt = status === "unpaid" ? now : null;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: data.clientId,
        billingProfileId: data.billingProfileId || null,
        orderId: data.orderId || null,
        status,
        currency: data.currency || "USD",
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        amountPaid: 0,
        amountDue,
        dueDate,
        issuedAt,
        notes: data.notes || null,
        metadata: data.metadata || null,
        lineItems: {
          create: lineItems,
        },
        discounts: {
          create: discountRows,
        },
      },
      include: {
        lineItems: true,
        discounts: true,
      },
    });

    return invoice;
  }

  // ============================================================
  // READ
  // ============================================================

  /**
   * Get invoice by ID with full relations.
   */
  async getById(id, includeRelations = true) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: includeRelations
        ? {
            lineItems: true,
            discounts: true,
            payments: { orderBy: { createdAt: "desc" } },
            transactions: { orderBy: { createdAt: "desc" } },
            order: {
              include: {
                snapshot: { select: { service: true, planData: true, pricing: true } },
              },
            },
            client: { select: { id: true, email: true } },
            billingProfile: true,
          }
        : undefined,
    });

    if (!invoice) {
      const err = new Error("Invoice not found");
      err.statusCode = 404;
      throw err;
    }

    return invoice;
  }

  /**
   * Get invoice by number.
   */
  async getByNumber(invoiceNumber) {
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: { lineItems: true, discounts: true, payments: true },
    });

    if (!invoice) {
      const err = new Error("Invoice not found");
      err.statusCode = 404;
      throw err;
    }

    return invoice;
  }

  /**
   * List all invoices (admin).
   */
  async listAll(options = {}) {
    const { limit = 50, offset = 0, status, clientId, orderId } = options;

    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (orderId) where.orderId = orderId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          client: { select: { id: true, email: true } },
          lineItems: true,
          payments: { select: { id: true, amount: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  }

  /**
   * List invoices for a specific client.
   */
  async listByClient(clientId, options = {}) {
    const { limit = 50, offset = 0, status } = options;

    const where = { clientId };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          lineItems: true,
          payments: { select: { id: true, amount: true, status: true, paidAt: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  }

  /**
   * List invoices linked to an order.
   */
  async listByOrder(orderId) {
    return prisma.invoice.findMany({
      where: { orderId },
      include: {
        lineItems: true,
        payments: { select: { id: true, amount: true, status: true, paidAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ============================================================
  // STATUS TRANSITIONS
  // ============================================================

  /**
   * Send invoice: draft → unpaid
   * Sets issuedAt and dueDate (if not already set).
   */
  async send(id, actor) {
    const invoice = await this.getById(id, false);

    if (invoice.status !== "draft") {
      const err = new Error("Only draft invoices can be sent");
      err.statusCode = 409;
      throw err;
    }

    const now = new Date();

    return prisma.invoice.update({
      where: { id },
      data: {
        status: "unpaid",
        issuedAt: now,
        dueDate: invoice.dueDate || calculateDueDate(now, 7),
      },
    });
  }

  /**
   * Cancel invoice.
   * Cannot cancel paid invoices.
   */
  async cancel(id, actor) {
    const invoice = await this.getById(id, false);

    if (invoice.status === "paid") {
      const err = new Error("Paid invoices cannot be cancelled");
      err.statusCode = 409;
      throw err;
    }

    if (invoice.status === "cancelled") {
      const err = new Error("Invoice is already cancelled");
      err.statusCode = 409;
      throw err;
    }

    return prisma.invoice.update({
      where: { id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
  }

  /**
   * Mark invoice as overdue (batch-safe).
   * Used by scheduled jobs.
   */
  async markOverdue(id) {
    return prisma.invoice.update({
      where: { id },
      data: { status: "overdue" },
    });
  }

  /**
   * Mark invoice as paid manually (admin override).
   * Partial payment tracking is handled by payment.service.js.
   */
  async markPaid(id, actor) {
    const invoice = await this.getById(id, false);

    if (invoice.status === "paid") {
      const err = new Error("Invoice is already marked as paid");
      err.statusCode = 409;
      throw err;
    }

    if (invoice.status === "cancelled") {
      const err = new Error("Cannot mark a cancelled invoice as paid");
      err.statusCode = 409;
      throw err;
    }

    const now = new Date();

    return prisma.invoice.update({
      where: { id },
      data: {
        status: "paid",
        amountPaid: invoice.totalAmount,
        amountDue: 0,
        paidAt: now,
      },
    });
  }

  // ============================================================
  // PAYMENT TRACKING (called by payment.service.js)
  // ============================================================

  /**
   * Apply a payment amount to the invoice.
   * Automatically marks as paid when amountDue reaches 0.
   *
   * @param {string} id - Invoice ID
   * @param {number} amount - Payment amount
   * @param {Date} [paidAt] - Payment timestamp
   * @returns {Object} Updated invoice
   */
  async applyPayment(id, amount, paidAt = new Date()) {
    const invoice = await this.getById(id, false);

    if (["paid", "cancelled", "refunded"].includes(invoice.status)) {
      const err = new Error(`Cannot apply payment to a ${invoice.status} invoice`);
      err.statusCode = 409;
      throw err;
    }

    const newAmountPaid = toCurrency(parseFloat(invoice.amountPaid) + parseFloat(amount));
    const newAmountDue = toCurrency(
      Math.max(0, parseFloat(invoice.totalAmount) - newAmountPaid)
    );
    const isPaid = newAmountDue <= 0;

    return prisma.invoice.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: isPaid ? "paid" : invoice.status,
        paidAt: isPaid ? paidAt : null,
      },
    });
  }

  /**
   * Reverse a payment (for refunds).
   *
   * @param {string} id - Invoice ID
   * @param {number} amount - Refund amount
   */
  async reversePayment(id, amount) {
    const invoice = await this.getById(id, false);

    const newAmountPaid = toCurrency(
      Math.max(0, parseFloat(invoice.amountPaid) - parseFloat(amount))
    );
    const newAmountDue = toCurrency(parseFloat(invoice.totalAmount) - newAmountPaid);

    return prisma.invoice.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newAmountPaid <= 0 ? "unpaid" : "paid",
        paidAt: newAmountPaid <= 0 ? null : invoice.paidAt,
      },
    });
  }

  // ============================================================
  // DISCOUNTS
  // ============================================================

  /**
   * Apply an additional discount to an existing invoice.
   * Only allowed on draft or unpaid invoices.
   */
  async applyDiscount(id, discountData, actor) {
    const invoice = await this.getById(id, false);

    if (!["draft", "unpaid"].includes(invoice.status)) {
      const err = new Error("Discounts can only be applied to draft or unpaid invoices");
      err.statusCode = 409;
      throw err;
    }

    let amount = toCurrency(discountData.amount);
    if (discountData.isPercent) {
      // Base the percentage on subtotal + taxAmount (the pre-discount total) so that
      // 100% actually zeroes the invoice rather than leaving taxAmount unpaid.
      const baseAmount = toCurrency(
        parseFloat(invoice.subtotal) + parseFloat(invoice.taxAmount || 0)
      );
      amount = toCurrency((baseAmount * Math.min(discountData.amount, 100)) / 100);
    }

    // Create discount record
    await prisma.invoiceDiscount.create({
      data: {
        invoiceId: id,
        type: discountData.type,
        code: discountData.code || null,
        description: discountData.description || null,
        amount,
        isPercent: discountData.isPercent || false,
      },
    });

    // Recalculate invoice totals
    return this._recalculateTotals(id);
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  /**
   * Get invoice statistics (admin dashboard).
   */
  async getStats() {
    const [statusCounts, revenue] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: "paid" },
        _sum: { totalAmount: true, taxAmount: true },
      }),
    ]);

    const byStatus = statusCounts.reduce((acc, row) => {
      acc[row.status] = {
        count: row._count.id,
        total: toCurrency(row._sum.totalAmount || 0),
      };
      return acc;
    }, {});

    return {
      byStatus,
      totalRevenue: toCurrency(revenue._sum.totalAmount || 0),
      totalTaxCollected: toCurrency(revenue._sum.taxAmount || 0),
    };
  }

  /**
   * Get overdue invoices (for scheduled jobs).
   */
  async getOverdue() {
    return prisma.invoice.findMany({
      where: {
        status: { in: ["unpaid"] },
        dueDate: { lt: new Date() },
      },
      include: {
        client: { select: { id: true, email: true } },
        order: { select: { id: true } },
      },
    });
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  /**
   * Recompute invoice totals after a discount or line item change.
   */
  async _recalculateTotals(id) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: true, discounts: true },
    });

    const subtotal = toCurrency(
      invoice.lineItems.reduce((s, li) => s + parseFloat(li.total), 0)
    );
    const taxAmount = toCurrency(
      invoice.lineItems.reduce((s, li) => s + parseFloat(li.taxAmount || 0), 0)
    );
    const discountAmount = toCurrency(
      invoice.discounts.reduce((s, d) => s + parseFloat(d.amount), 0)
    );
    const totalAmount = toCurrency(
      Math.max(0, subtotal + taxAmount - discountAmount)
    );
    const amountDue = toCurrency(
      Math.max(0, totalAmount - parseFloat(invoice.amountPaid))
    );

    return prisma.invoice.update({
      where: { id },
      data: { subtotal, taxAmount, discountAmount, totalAmount, amountDue },
      include: { lineItems: true, discounts: true },
    });
  }
}

module.exports = new InvoiceService();