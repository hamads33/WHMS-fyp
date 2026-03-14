/**
 * payment-gateway/service.js
 * ------------------------------------------------------------------
 * Example payment gateway service.
 *
 * In a real plugin this would wrap a payment provider SDK
 * (Stripe, PayPal, Braintree, etc.).
 *
 * This example demonstrates the service contract expected by the
 * core billing module when it calls ctx.services.get("paymentGateway").
 */

class PaymentGatewayService {
  /**
   * @param {object} opts
   * @param {string} opts.apiKey   - Provider API key from plugin config
   * @param {object} opts.logger   - Logger instance
   */
  constructor({ apiKey, logger = console } = {}) {
    this.apiKey  = apiKey;
    this.logger  = logger;
    this.name    = "example-payment-gateway";
  }

  /**
   * charge
   * Charge a customer for an invoice amount.
   *
   * @param  {object} opts
   * @param  {string} opts.customerId   - Internal customer identifier
   * @param  {number} opts.amount       - Amount in smallest currency unit (cents)
   * @param  {string} opts.currency     - ISO 4217 currency code (e.g. "USD")
   * @param  {string} opts.description  - Human-readable charge description
   * @returns {Promise<{ success: boolean, transactionId: string }>}
   */
  async charge({ customerId, amount, currency = "USD", description }) {
    this.logger.info(`[PaymentGateway] Charging ${amount} ${currency} for customer ${customerId}`);

    // --- Replace this block with real provider API call ---
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    // ------------------------------------------------------

    return { success: true, transactionId };
  }

  /**
   * refund
   * Refund a previous transaction.
   *
   * @param  {object} opts
   * @param  {string} opts.transactionId  - Transaction to refund
   * @param  {number} [opts.amount]       - Partial refund amount (omit for full refund)
   * @returns {Promise<{ success: boolean, refundId: string }>}
   */
  async refund({ transactionId, amount }) {
    this.logger.info(`[PaymentGateway] Refunding transaction ${transactionId}`);

    // --- Replace this block with real provider API call ---
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    // ------------------------------------------------------

    return { success: true, refundId };
  }

  /**
   * getPaymentMethods
   * Retrieve saved payment methods for a customer.
   *
   * @param  {string} customerId
   * @returns {Promise<Array>}
   */
  async getPaymentMethods(customerId) {
    this.logger.info(`[PaymentGateway] Fetching payment methods for customer ${customerId}`);
    // Return empty array in this stub — replace with real API call
    return [];
  }
}

module.exports = PaymentGatewayService;
