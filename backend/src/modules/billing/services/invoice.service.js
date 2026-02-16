/**
 * Invoice Service
 * Path: src/modules/billing/services/invoice.service.js
 */

const prisma = require("../../../../prisma");
const {
  generateInvoiceNumber,
  calculateDueDate,
  buildTotals,
} = require("../utils/billing.util");
const taxService = require("./tax.service");
const billingProfileService = require("./billing-profile.service");

class InvoiceService {
  /**
   * Generate invoice from an order snapshot (FR-01)
   */
  async generateFromOrder(orderId, options = {}) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        snapshot: true,
        client: { select: { id: true, email: true } },
      },
    });

    if (!order) {
      const err = new Error("Order not found");
      err.statusCode = 404;
      throw err;
    }

    if (!options.force) {
      const existing = await prisma.invoice.findFirst({
        where: { orderId, status: { not: "cancelled" } },
      });
      if (existing) {
        const err = new Error("An active invoice already exists for this order");
        err.statusCode = 409;
        throw err;
      }
    }

    const snap = order.snapshot.snapshot;
    const clientId = order.clientId;

    const profile = await billingProfileService.getOrCreate(clientId);
    const currency = profile.currency || snap.pricing?.currency || "USD";

    const unitPrice = parseFloat(snap.pricing?.price || 0);
    const lineItem = {
      description: `${snap.service?.name} — ${snap.plan?.name} (${snap.pricing?.cycle})`,
      quantity: 1,
      unitPrice,
      total: unitPrice,
      serviceCode: snap.service?.code,
      planName: snap.plan?.name,
      cycle: snap.pricing?.cycle,
    };

    const taxRate = await taxService.getApplicableRate(clientId, snap.service?.code);
    const totals = buildTotals([lineItem], taxRate, []);

    const invoiceNumber = await generateInvoiceNumber();
    const dueDate = calculateDueDate(options.dueDays || 7);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        orderId,
        billingProfileId: profile.id,
        status: "unpaid",
        currency,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        amountPaid: 0,
        amountDue: totals.amountDue,
        dueDate,
        issuedAt: new Date(),
        notes: options.notes || null,
        lineItems: {
          create: [
            {
              description: lineItem.description,
              quantity: lineItem.quantity,
              unitPrice: lineItem.unitPrice,
              total: lineItem.total,
              taxRate: taxRate || null,
              taxAmount: totals.taxAmount,
              serviceCode: lineItem.serviceCode,
              planName: lineItem.planName,
              cycle: lineItem.cycle,
            },
          ],
        },
      },
      include: { lineItems: true },
    });

    await this._logTransaction(invoice.id, clientId, "payment", 0, "Invoice created");
    return invoice;
  }

  /**
   * Create invoice manually (FR-02)
   */
  async create(clientId, data) {
    const profile = await billingProfileService.getOrCreate(clientId);
    const currency = data.currency || profile.currency || "USD";

    const lineItems = data.lineItems || [];
    if (!lineItems.length) {
      const err = new Error("At least one line item is required");
      err.statusCode = 400;
      throw err;
    }

    const itemsWithTotals = lineItems.map((item) => ({
      ...item,
      total: parseFloat((item.unitPrice * item.quantity).toFixed(2)),
    }));

    const totals = buildTotals(itemsWithTotals, data.taxRate || 0, data.discounts || []);
    const invoiceNumber = await generateInvoiceNumber();
    const dueDate = data.dueDate ? new Date(data.dueDate) : calculateDueDate(7);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        billingProfileId: profile.id,
        orderId: data.orderId || null,
        status: data.status || "draft",
        currency,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        amountPaid: 0,
        amountDue: totals.amountDue,
        dueDate,
        issuedAt: data.status === "unpaid" ? new Date() : null,
        notes: data.notes || null,
        lineItems: { create: itemsWithTotals },
        discounts: data.discounts?.length ? { create: data.discounts } : undefined,
      },
      include: { lineItems: true, discounts: true },
    });

    await this._logTransaction(invoice.id, clientId, "payment", 0, "Manual invoice created");
    return invoice;
  }

  /**
   * Get invoice by ID
   * ✅ FIXED:
   *   - Removed billingProfile include (caused 500 before migration)
   *   - requester defaults to null (admin calls pass nothing)
   *   - Role check uses req.user.roles array (authGuard shape)
   */
  async getById(invoiceId, requester = null) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lineItems: true,
        discounts: true,
        payments: true,
        client: { select: { id: true, email: true } },
      },
    });

    if (!invoice) {
      const err = new Error("Invoice not found");
      err.statusCode = 404;
      throw err;
    }

    // Only enforce ownership check for clients
    // authGuard sets req.user.roles as array e.g. ["client"]
    const isClient =
      requester?.roles?.includes("client") ||
      requester?.role === "client";

    if (isClient && invoice.clientId !== requester.id) {
      const err = new Error("Unauthorized");
      err.statusCode = 403;
      throw err;
    }

    return invoice;
  }

  /**
   * List invoices for a client
   */
  async getClientInvoices(clientId, options = {}) {
    const { limit = 50, offset = 0, status } = options;
    const where = { clientId };
    if (status) where.status = status;

    return prisma.invoice.findMany({
      where,
      include: { lineItems: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Admin: list all invoices
   */
  async adminList(options = {}) {
    const { limit = 100, offset = 0, status, clientId } = options;
    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    return prisma.invoice.findMany({
      where,
      include: {
        lineItems: true,
        client: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Update invoice (draft only)
   */
  async update(invoiceId, data) {
    const invoice = await this.getById(invoiceId);

    if (invoice.status !== "draft") {
      const err = new Error("Only draft invoices can be updated");
      err.statusCode = 409;
      throw err;
    }

    const updateData = {};
    const allowed = ["notes", "dueDate", "currency"];
    for (const field of allowed) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: { lineItems: true },
    });
  }

  /**
   * Cancel invoice (FR-06)
   */
  async cancel(invoiceId) {
    const invoice = await this.getById(invoiceId);

    if (["paid", "cancelled"].includes(invoice.status)) {
      const err = new Error(`Cannot cancel a ${invoice.status} invoice`);
      err.statusCode = 409;
      throw err;
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    await this._logTransaction(invoiceId, invoice.clientId, "adjustment", 0, "Invoice cancelled");
    return updated;
  }

  /**
   * Apply discount/credit to invoice (FR-08)
   */
  async applyDiscount(invoiceId, discountData) {
    const invoice = await this.getById(invoiceId);

    if (!["draft", "unpaid"].includes(invoice.status)) {
      const err = new Error("Discounts can only be applied to draft or unpaid invoices");
      err.statusCode = 409;
      throw err;
    }

    await prisma.invoiceDiscount.create({
      data: {
        invoiceId,
        type: discountData.type || "manual",
        code: discountData.code || null,
        description: discountData.description || null,
        amount: discountData.amount,
        isPercent: discountData.isPercent || false,
      },
    });

    const lineItems = await prisma.invoiceLineItem.findMany({ where: { invoiceId } });
    const discounts = await prisma.invoiceDiscount.findMany({ where: { invoiceId } });

    const taxRate = parseFloat(invoice.subtotal) > 0
      ? parseFloat(invoice.taxAmount) / parseFloat(invoice.subtotal)
      : 0;

    const totals = buildTotals(lineItems, taxRate, discounts);
    const amountPaid = parseFloat(invoice.amountPaid);
    const newAmountDue = Math.max(totals.totalAmount - amountPaid, 0);

    return prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        amountDue: newAmountDue,
      },
      include: { lineItems: true, discounts: true },
    });
  }

  /**
   * Mark overdue invoices (FR-14) — called by scheduler
   */
  async markOverdue() {
    const now = new Date();
    return prisma.invoice.updateMany({
      where: { status: "unpaid", dueDate: { lt: now } },
      data: { status: "overdue" },
    });
  }

  /**
   * Get overdue invoices (FR-14)
   */
  async getOverdue(options = {}) {
    const { limit = 100, offset = 0 } = options;
    return prisma.invoice.findMany({
      where: { status: "overdue" },
      include: {
        client: { select: { id: true, email: true } },
        lineItems: true,
      },
      orderBy: { dueDate: "asc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Internal: log billing transaction (FR-10)
   */
  async _logTransaction(invoiceId, clientId, type, amount, description) {
    return prisma.billingTransaction.create({
      data: { invoiceId, clientId, type, amount, description },
    });
  }
}

module.exports = new InvoiceService();