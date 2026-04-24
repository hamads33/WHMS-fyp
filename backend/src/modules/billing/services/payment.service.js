/**
 * Payment Service
 * Path: src/modules/billing/services/payment.service.js
 *
 * Handles payment recording, gateway integration stubs,
 * refund processing, and transaction logging.
 * Delegates invoice balance tracking to invoice.service.js.
 */

const prisma = require("../../../../prisma");
const invoiceService = require("./invoice.service");
const { toCurrency } = require("../utils/billing.util");
const serviceContainer = require("../../../core/plugin-system/service.container");
const hookRegistry = require("../../../core/plugin-system/hook.registry");
const { settlePaidInvoice } = require("./invoice-settlement.service");

class PaymentService {
  // ============================================================
  // CREATE PAYMENT
  // ============================================================

  /**
   * Record a payment against an invoice.
   * Validates invoice is payable, records the payment,
   * updates invoice balance, and logs a billing transaction.
   *
   * @param {string} invoiceId
   * @param {Object} data
   * @param {number} data.amount
   * @param {string} [data.currency]
   * @param {string} [data.gateway]       - "stripe" | "paypal" | "manual"
   * @param {string} [data.gatewayRef]    - External transaction ID
   * @param {Object} [data.gatewayResponse]
   * @param {string} actor - User ID creating the payment
   */
  async create(invoiceId, data, actor) {
    if (data.gatewayRef) {
      const existingPayment = await prisma.payment.findFirst({
        where: {
          invoiceId,
          gatewayRef: data.gatewayRef,
          status: "completed",
        },
      });

      if (existingPayment) {
        return {
          payment: existingPayment,
          invoice: await invoiceService.getById(invoiceId, false),
        };
      }
    }

    const invoice = await invoiceService.getById(invoiceId, false);

    // Validate invoice is payable
    if (["paid", "cancelled", "refunded"].includes(invoice.status)) {
      const err = new Error(`Invoice is ${invoice.status} and cannot accept payments`);
      err.statusCode = 409;
      throw err;
    }

    const amount = toCurrency(data.amount);

    if (amount <= 0) {
      const err = new Error("Payment amount must be greater than 0");
      err.statusCode = 400;
      throw err;
    }

    if (amount > toCurrency(invoice.amountDue)) {
      const err = new Error(
        `Payment amount (${amount}) exceeds amount due (${invoice.amountDue})`
      );
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        clientId: invoice.clientId,
        amount,
        currency: data.currency || invoice.currency,
        status: "completed",
        gateway: data.gateway || "manual",
        gatewayRef: data.gatewayRef || null,
        gatewayResponse: data.gatewayResponse || null,
        gatewayStatus: data.gatewayStatus || "completed",
        paidAt: now,
      },
    });

    // Apply payment to invoice balance
    const updatedInvoice = await invoiceService.applyPayment(invoiceId, amount, now);

    // Log billing transaction
    await this._logTransaction(invoiceId, invoice.clientId, {
      type: "payment",
      amount,
      currency: data.currency || invoice.currency,
      description: `Payment via ${data.gateway || "manual"} - ${payment.id}`,
    });

    // Notify plugin hooks when an invoice is fully settled
    if (updatedInvoice.status === "paid") {
      hookRegistry.trigger("invoice.paid", {
        invoiceId : updatedInvoice.id,
        clientId  : updatedInvoice.clientId,
        orderId   : updatedInvoice.orderId ?? null,
        amount    : updatedInvoice.totalAmount,
        currency  : updatedInvoice.currency,
        paidAt    : now,
      }).catch(() => {});
    }

    // If invoice is now fully paid, trigger post-payment pipeline
    if (updatedInvoice.status === "paid" && updatedInvoice.orderId) {
      setImmediate(async () => {
        try {
          await settlePaidInvoice(updatedInvoice.id);
        } catch (err) {
          console.error("[PaymentService] Post-payment pipeline error:", err.message);
        }
      });
    }

    return {
      payment,
      invoice: updatedInvoice,
    };
  }

  /**
   * Initiate a gateway payment session.
   * Returns a checkout URL / client secret for the frontend.
   *
   * @param {string} invoiceId
   * @param {string} gateway - "stripe" | "paypal"
   * @param {Object} options
   * @param {string} actor
   */
  async initiateGatewayPayment(invoiceId, gateway, options = {}, actor) {
    const invoice = await invoiceService.getById(invoiceId, true);

    if (!["unpaid", "overdue", "draft"].includes(invoice.status)) {
      const err = new Error(`Invoice cannot be paid (status: ${invoice.status})`);
      err.statusCode = 409;
      throw err;
    }

    if (gateway === "manual") {
      const result = await this.create(
        invoiceId,
        {
          amount: invoice.amountDue,
          currency: invoice.currency,
          gateway: "manual",
          notes: "Manual / bank transfer payment recorded at checkout",
        },
        actor
      );
      return { payment: result.payment, invoice: result.invoice };
    }

    // Attempt to load the gateway plugin
    const pluginService = serviceContainer.get(`paymentGateway:${gateway}`);
    if (pluginService && typeof pluginService.initiatePayment === "function") {
      return pluginService.initiatePayment(invoice, options);
    }

    // Fallback if not found
    const err = new Error(`Unsupported payment gateway: "${gateway}"`);
    err.statusCode = 400;
    throw err;
  }

  /**
   * Handle gateway webhook / callback.
   * This is deprecated in favor of plugins mounting their own webhooks.
   */
  async handleGatewayCallback(gateway, payload, signature) {
    throw new Error(`Core webhook handler deprecated. Gateways must process their own webhooks.`);
  }

  // ============================================================
  // READ
  // ============================================================

  /**
   * Get payment by ID.
   */
  async getById(id) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
        client: { select: { id: true, email: true } },
        refunds: true,
      },
    });

    if (!payment) {
      const err = new Error("Payment not found");
      err.statusCode = 404;
      throw err;
    }

    return payment;
  }

  /**
   * List payments for an invoice.
   */
  async listByInvoice(invoiceId) {
    await invoiceService.getById(invoiceId, false); // Validate invoice exists

    return prisma.payment.findMany({
      where: { invoiceId },
      include: { refunds: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * List payments for a client.
   */
  async listByClient(clientId, options = {}) {
    const { limit = 50, offset = 0, status } = options;

    const where = { clientId };
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoiceNumber: true } },
          refunds: { select: { id: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total };
  }

  /**
   * List all payments (admin).
   */
  async listAll(options = {}) {
    const { limit = 50, offset = 0, status, gateway, clientId } = options;

    const where = {};
    if (status) where.status = status;
    if (gateway) where.gateway = gateway;
    if (clientId) where.clientId = clientId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          client: { select: { id: true, email: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
          refunds: { select: { id: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total };
  }

  // ============================================================
  // REFUNDS
  // ============================================================

  /**
   * Process a refund for a completed payment.
   *
   * @param {string} paymentId
   * @param {Object} data
   * @param {number} data.amount
   * @param {string} [data.reason]
   * @param {string} [data.notes]
   * @param {string} actor
   */
  async refund(paymentId, data, actor) {
    const payment = await this.getById(paymentId);

    if (payment.status !== "completed") {
      const err = new Error("Only completed payments can be refunded");
      err.statusCode = 409;
      throw err;
    }

    const amount = toCurrency(data.amount);
    const alreadyRefunded = toCurrency(
      payment.refunds.reduce((s, r) => s + parseFloat(r.amount), 0)
    );
    const refundable = toCurrency(parseFloat(payment.amount) - alreadyRefunded);

    if (amount > refundable) {
      const err = new Error(
        `Refund amount (${amount}) exceeds refundable balance (${refundable})`
      );
      err.statusCode = 400;
      throw err;
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        paymentId,
        invoiceId: payment.invoiceId,
        amount,
        reason: data.reason || null,
        notes: data.notes || null,
        gateway: payment.gateway,
        processedAt: new Date(),
      },
    });

    // Mark payment as refunded if fully refunded
    const totalRefunded = toCurrency(alreadyRefunded + amount);
    const isFullRefund = totalRefunded >= parseFloat(payment.amount);

    if (isFullRefund) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "refunded" },
      });
    }

    // Reverse payment on invoice
    await invoiceService.reversePayment(payment.invoiceId, amount);

    // Log billing transaction
    await this._logTransaction(payment.invoiceId, payment.clientId, {
      type: "refund",
      amount,
      currency: payment.currency,
      description: `Refund for payment ${paymentId}${data.reason ? ` - ${data.reason}` : ""}`,
    });

    return { refund, isFullRefund };
  }

  /**
   * List refunds for a payment.
   */
  async listRefundsByPayment(paymentId) {
    await this.getById(paymentId); // Validate
    return prisma.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  /**
   * Get payment statistics for admin dashboard.
   */
  async getStats() {
    // gateway is nullable — filter to rows where gateway IS NOT NULL before groupBy
    // to avoid Prisma groupBy issues with nullable columns
    const [byGateway, byStatus, refunds] = await Promise.all([
      prisma.payment.groupBy({
        by: ["gateway"],
        where: { status: "completed", gateway: { not: null } },
        _count: { id: true },
        _sum: { amount: true },
      }).catch(() => []),
      prisma.payment.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { amount: true },
      }).catch(() => []),
      prisma.refund.aggregate({
        _count: { id: true },
        _sum: { amount: true },
      }).catch(() => ({ _count: { id: 0 }, _sum: { amount: null } })),
    ]);

    return {
      byGateway: byGateway.map((row) => ({
        gateway: row.gateway,
        count: row._count.id,
        total: toCurrency(row._sum.amount || 0),
      })),
      byStatus: byStatus.reduce((acc, row) => {
        acc[row.status] = {
          count: row._count.id,
          total: toCurrency(row._sum.amount || 0),
        };
        return acc;
      }, {}),
      refunds: {
        count: refunds._count.id,
        total: toCurrency(refunds._sum.amount || 0),
      },
    };
  }

  // ============================================================
  // PRIVATE: TRANSACTION LOG
  // ============================================================

  async _logTransaction(invoiceId, clientId, data) {
    try {
      await prisma.billingTransaction.create({
        data: {
          invoiceId,
          clientId,
          type: data.type,
          amount: data.amount,
          currency: data.currency || "USD",
          description: data.description || null,
          meta: data.meta || null,
        },
      });
    } catch (err) {
      // Log but don't fail the parent operation
      console.error("Failed to log billing transaction:", err.message);
    }
  }
}

module.exports = new PaymentService();
