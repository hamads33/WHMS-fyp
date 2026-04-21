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
const provisioningHooks = require("../../provisioning/utils/provisioning-hooks");
const Stripe = require('stripe');

/* STRIPE SANDBOX TESTING
 *
 * Test card numbers (use any future expiry + any 3-digit CVC):
 *   Success:           4242 4242 4242 4242
 *   Requires auth:     4000 0025 0000 3155
 *   Declined:          4000 0000 0000 9995
 *
 * Setup:
 *   1. Copy .env values from Stripe Dashboard → Developers → API Keys
 *   2. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 *   3. Forward webhooks locally:
 *        stripe listen --forward-to localhost:4000/api/billing/webhooks/stripe
 *   4. Copy the webhook signing secret printed by the CLI into STRIPE_WEBHOOK_SECRET
 *   5. Set NEXT_PUBLIC_APP_URL=http://localhost:3000 in .env
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

    // If invoice is now fully paid, trigger post-payment pipeline
    if (updatedInvoice.status === "paid" && updatedInvoice.orderId) {
      setImmediate(async () => {
        try {
          const order = await prisma.order.findUnique({
            where: { id: updatedInvoice.orderId },
            select: { id: true, status: true },
          });

          if (order?.status === "pending") {
            // Auto-activate order on first payment
            const { getNextRenewalDate } = require("../utils/billing.util");
            const fullOrder = await prisma.order.findUnique({ where: { id: order.id }, select: { snapshotId: true } });
            const snap = fullOrder?.snapshotId
              ? await prisma.serviceSnapshot.findUnique({ where: { id: fullOrder.snapshotId } })
              : null;
            const cycle = snap?.pricing?.cycle || "monthly";
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "active", startedAt: new Date(), nextRenewalAt: getNextRenewalDate(new Date(), cycle) },
            });
            await provisioningHooks.onOrderActivated(order.id);
          } else if (order?.status === "suspended") {
            // Unsuspend on payment after suspension
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "active", suspendedAt: null },
            });
            await provisioningHooks.onInvoicePaid(updatedInvoice.id, order.id);
          }
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

    // Gateway stubs — integrate with actual providers here
    switch (gateway) {
      case "stripe":
        return this._initiateStripe(invoice, options);
      case "paypal":
        return this._initiatePayPal(invoice, options);
      case "manual": {
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
      default: {
        const err = new Error(`Unsupported payment gateway: "${gateway}"`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  /**
   * Handle gateway webhook / callback.
   * Validates the event, records payment, updates invoice.
   *
   * @param {string} gateway - "stripe" | "paypal"
   * @param {Object} payload - Raw webhook payload
   * @param {string} [signature] - Webhook signature header
   */
  async handleGatewayCallback(gateway, payload, signature) {
    switch (gateway) {
      case "stripe":
        return this._handleStripeCallback(payload, signature);
      case "paypal":
        return this._handlePayPalCallback(payload);
      default:
        throw new Error(`Unknown gateway callback: ${gateway}`);
    }
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
  // PRIVATE: GATEWAY STUBS
  // ============================================================

  async _initiateStripe(invoice, options) {
    const lineItems = invoice.lineItems.map(li => ({
      price_data: {
        currency: invoice.currency.toLowerCase(),
        product_data: {
          name: li.description,
        },
        unit_amount: Math.round(li.unitPrice * 100),
      },
      quantity: li.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/store/checkout?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/store/checkout?status=cancelled`,
      metadata: {
        invoiceId: invoice.id,
        clientId: invoice.clientId,
      },
      client_reference_id: invoice.clientId,
      currency: invoice.currency.toLowerCase(),
    });

    return {
      gateway: 'stripe',
      invoiceId: invoice.id,
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async _initiatePayPal(invoice, options) {
    // TODO: Integrate with PayPal SDK
    return {
      gateway: "paypal",
      invoiceId: invoice.id,
      amount: invoice.amountDue,
      currency: invoice.currency,
      approvalUrl: null,
      orderId: null,
      message: "PayPal integration pending - connect PayPal SDK",
    };
  }

  async _handleStripeCallback(payload, signature) {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { invoiceId, clientId } = session.metadata;
      const sessionId = session.id;
      const paymentIntentId = session.payment_intent;
      const amountTotal = session.amount_total / 100;
      const currency = session.currency.toUpperCase();

      await this.create(
        invoiceId,
        {
          amount: amountTotal,
          currency,
          gateway: 'stripe',
          gatewayRef: paymentIntentId || sessionId,
          gatewayResponse: session,
          gatewayStatus: event.type,
        },
        clientId
      );
    }

    return { status: 'ok', event: event.type };
  }

  async _handlePayPalCallback(payload) {
    // TODO: Verify PayPal IPN and process event
    return { status: "stub", message: "PayPal callback handler pending" };
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