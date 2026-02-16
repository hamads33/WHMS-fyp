/**
 * Payment Service
 * Path: src/modules/billing/services/payment.service.js
 * FR-04: Payment recording (partial, full, advance)
 * FR-05: Payment gateway integration layer
 * FR-06: Invoice status update on payment
 */

const prisma = require("../../../../prisma");
const invoiceService = require("./invoice.service");

class PaymentService {
  /**
   * Record a payment against an invoice (FR-04)
   * Supports partial, full, and advance payments
   */
  async recordPayment(invoiceId, data) {
    const invoice = await invoiceService.getById(invoiceId);

    if (!["unpaid", "overdue"].includes(invoice.status)) {
      const err = new Error(
        `Cannot record payment on a ${invoice.status} invoice`
      );
      err.statusCode = 409;
      throw err;
    }

    const amount = parseFloat(data.amount);
    if (amount <= 0) {
      const err = new Error("Payment amount must be greater than 0");
      err.statusCode = 400;
      throw err;
    }

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
        gatewayStatus: data.gatewayStatus || null,
        paidAt: new Date(),
      },
    });

    // Update invoice paid amount and status
    const newAmountPaid = parseFloat(invoice.amountPaid) + amount;
    const newAmountDue = Math.max(
      parseFloat(invoice.totalAmount) - newAmountPaid,
      0
    );

    let newStatus = invoice.status;
    if (newAmountDue <= 0) {
      newStatus = "paid";
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        paidAt: newStatus === "paid" ? new Date() : undefined,
      },
    });

    // Log transaction
    await invoiceService._logTransaction(
      invoiceId,
      invoice.clientId,
      "payment",
      amount,
      `Payment recorded via ${data.gateway || "manual"}`
    );

    return payment;
  }

  /**
   * Initiate gateway payment (FR-05)
   * Returns a payment intent / redirect URL depending on gateway
   */
  async initiateGatewayPayment(invoiceId, gatewayData) {
    const invoice = await invoiceService.getById(invoiceId);

    if (!["unpaid", "overdue"].includes(invoice.status)) {
      const err = new Error(`Invoice is ${invoice.status}, cannot initiate payment`);
      err.statusCode = 409;
      throw err;
    }

    const gateway = gatewayData.gateway;

    // Create a pending payment record
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        clientId: invoice.clientId,
        amount: parseFloat(invoice.amountDue),
        currency: invoice.currency,
        status: "pending",
        gateway,
        gatewayRef: gatewayData.gatewayRef || null,
        gatewayResponse: gatewayData.meta || null,
      },
    });

    // Log attempt
    await invoiceService._logTransaction(
      invoiceId,
      invoice.clientId,
      "payment",
      parseFloat(invoice.amountDue),
      `Gateway payment initiated via ${gateway}`
    );

    return {
      paymentId: payment.id,
      invoiceId,
      amount: invoice.amountDue,
      currency: invoice.currency,
      gateway,
      status: "pending",
    };
  }

  /**
   * Handle gateway callback / webhook (FR-05)
   */
  async handleGatewayCallback(paymentId, callbackData) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      const err = new Error("Payment not found");
      err.statusCode = 404;
      throw err;
    }

    const gatewayStatus = callbackData.status; // "success" | "failed"
    const isSuccess = gatewayStatus === "success" || gatewayStatus === "completed";

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: isSuccess ? "completed" : "failed",
        gatewayRef: callbackData.gatewayRef || payment.gatewayRef,
        gatewayResponse: callbackData.raw || null,
        gatewayStatus: callbackData.status,
        paidAt: isSuccess ? new Date() : null,
        failedAt: !isSuccess ? new Date() : null,
        failReason: !isSuccess ? callbackData.reason || null : null,
      },
    });

    if (isSuccess) {
      // Update invoice on success
      const invoice = await invoiceService.getById(payment.invoiceId);
      const newAmountPaid = parseFloat(invoice.amountPaid) + parseFloat(payment.amount);
      const newAmountDue = Math.max(parseFloat(invoice.totalAmount) - newAmountPaid, 0);

      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newAmountDue <= 0 ? "paid" : invoice.status,
          paidAt: newAmountDue <= 0 ? new Date() : undefined,
        },
      });

      await invoiceService._logTransaction(
        payment.invoiceId,
        payment.clientId,
        "payment",
        parseFloat(payment.amount),
        `Gateway payment confirmed: ${payment.gateway}`
      );
    }

    return updated;
  }

  /**
   * Get payment by ID
   */
  async getById(paymentId) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { refunds: true },
    });

    if (!payment) {
      const err = new Error("Payment not found");
      err.statusCode = 404;
      throw err;
    }

    return payment;
  }

  /**
   * List payments for an invoice
   */
  async getByInvoiceId(invoiceId) {
    return prisma.payment.findMany({
      where: { invoiceId },
      include: { refunds: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * List payments for a client
   */
  async getClientPayments(clientId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    return prisma.payment.findMany({
      where: { clientId },
      include: { invoice: { select: { invoiceNumber: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }
}

module.exports = new PaymentService();