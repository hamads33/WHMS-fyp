/**
 * stripe/service.js
 * ------------------------------------------------------------------
 * Stripe Payment Gateway plugin service.
 */

const Stripe = require('stripe');

class StripeGatewayService {
  /**
   * @param {object} opts
   * @param {string} opts.secretKey - Stripe Secret Key
   * @param {string} opts.webhookSecret - Stripe Webhook Secret
   * @param {object} opts.logger - Logger instance
   */
  constructor({ secretKey, webhookSecret, appUrl, logger = console } = {}) {
    this.name = "stripe";
    this.logger = logger;
    this.webhookSecret = webhookSecret;
    this.appUrl = appUrl || "http://localhost:3000";
    this.stripe = new Stripe(secretKey || "sk_test_dummy");
  }

  /**
   * initiatePayment
   * Initiate a gateway payment session.
   *
   * @param {object} invoice
   * @param {object} options
   * @returns {Promise<{ gateway: string, invoiceId: string, checkoutUrl: string, sessionId: string }>}
   */
  async initiatePayment(invoice, options = {}) {
    this.logger.info(`[StripeGateway] Initiating payment for invoice ${invoice.id}`);

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

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${this.appUrl}/store/checkout?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${this.appUrl}/store/checkout?status=cancelled`,
      metadata: {
        invoiceId: invoice.id,
        clientId: invoice.clientId,
      },
      client_reference_id: invoice.clientId,
      currency: invoice.currency.toLowerCase(),
    });

    return {
      gateway: this.name,
      invoiceId: invoice.id,
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * handleWebhook
   * Handle gateway webhook / callback.
   *
   * @param {object} req - Express request object (raw body needed for stripe)
   * @returns {Promise<{ status: string, event: string, paymentData: object }>}
   */
  async handleWebhook(payload, signature) {
    let event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    let paymentData = null;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { invoiceId, clientId } = session.metadata;
      const sessionId = session.id;
      const paymentIntentId = session.payment_intent;
      const amountTotal = session.amount_total / 100;
      const currency = session.currency.toUpperCase();

      paymentData = {
        invoiceId,
        clientId,
        amount: amountTotal,
        currency,
        gateway: this.name,
        gatewayRef: paymentIntentId || sessionId,
        gatewayResponse: session,
        gatewayStatus: event.type,
      };
    }

    return { status: 'ok', event: event.type, paymentData };
  }
}

module.exports = StripeGatewayService;
