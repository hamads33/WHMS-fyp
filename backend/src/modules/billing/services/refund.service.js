/**
 * Refund Service
 * Path: src/modules/billing/services/refund.service.js
 * FR-09: Full and partial refund processing
 */

const prisma = require("../../../../prisma");
const invoiceService = require("./invoice.service");

class RefundService {
  /**
   * Process a refund (full or partial)
   */
  async processRefund(paymentId, data) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { refunds: true },
    });

    if (!payment) {
      const err = new Error("Payment not found");
      err.statusCode = 404;
      throw err;
    }

    if (payment.status !== "completed") {
      const err = new Error("Only completed payments can be refunded");
      err.statusCode = 409;
      throw err;
    }

    const amount = parseFloat(data.amount);
    if (amount <= 0) {
      const err = new Error("Refund amount must be greater than 0");
      err.statusCode = 400;
      throw err;
    }

    // Calculate already refunded amount
    const totalRefunded = payment.refunds.reduce(
      (sum, r) => sum + parseFloat(r.amount),
      0
    );
    const refundable = parseFloat(payment.amount) - totalRefunded;

    if (amount > refundable) {
      const err = new Error(
        `Refund amount exceeds refundable balance of ${refundable}`
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
        gatewayRef: data.gatewayRef || null,
        processedAt: new Date(),
      },
    });

    // Update payment status if fully refunded
    const newTotalRefunded = totalRefunded + amount;
    const isFullRefund = newTotalRefunded >= parseFloat(payment.amount);

    if (isFullRefund) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "refunded" },
      });
    }

    // Update invoice: reduce amountPaid, recalculate amountDue, update status
    const invoice = await invoiceService.getById(payment.invoiceId);
    const newAmountPaid = Math.max(parseFloat(invoice.amountPaid) - amount, 0);
    const newAmountDue = parseFloat(invoice.totalAmount) - newAmountPaid;

    // ✅ FIXED: invoice "refunded" only when amountPaid drops to 0 (fully refunded)
    // isFullRefund on payment != fully refunded invoice (partial payments exist)
    const isInvoiceFullyRefunded = newAmountPaid <= 0;
    const newInvoiceStatus = isInvoiceFullyRefunded ? "refunded" : "unpaid";

    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newInvoiceStatus,
        paidAt: null,
      },
    });

    // Log transaction
    await invoiceService._logTransaction(
      payment.invoiceId,
      payment.clientId,
      "refund",
      amount,
      `Refund processed: ${data.reason || "no reason"}`
    );

    return refund;
  }

  /**
   * Get refunds for a payment
   */
  async getByPaymentId(paymentId) {
    return prisma.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get refunds for an invoice
   */
  async getByInvoiceId(invoiceId) {
    return prisma.refund.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get refund by ID
   */
  async getById(refundId) {
    const refund = await prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) {
      const err = new Error("Refund not found");
      err.statusCode = 404;
      throw err;
    }
    return refund;
  }
}

module.exports = new RefundService();