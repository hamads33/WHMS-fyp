/**
 * payment-gateway/hooks.js
 * ------------------------------------------------------------------
 * Hook handlers for the payment gateway plugin.
 *
 * Each exported function is a hook handler.
 * The plugin's register() wires these up via ctx.hooks.register().
 */

/**
 * onInvoicePaid
 * Called when core billing marks an invoice as paid.
 * Use this to trigger fulfilment, send receipts, update CRM, etc.
 *
 * @param {object} payload
 * @param {number} payload.invoiceId
 * @param {number} payload.amount
 * @param {string} payload.currency
 * @param {string} payload.customerId
 */
async function onInvoicePaid({ invoiceId, amount, currency, customerId }) {
  console.info(
    `[PaymentGateway] invoice.paid — Invoice #${invoiceId} ` +
    `paid by customer ${customerId} (${amount} ${currency})`
  );
  // Example: send receipt email, update CRM, activate service…
}

/**
 * onOrderCreated
 * Called when a new order is placed.
 * Use this to pre-authorise a payment or perform fraud checks.
 *
 * @param {object} payload
 * @param {number} payload.orderId
 * @param {string} payload.customerId
 * @param {number} payload.total
 */
async function onOrderCreated({ orderId, customerId, total }) {
  console.info(
    `[PaymentGateway] order.created — Order #${orderId} ` +
    `by customer ${customerId}, total: ${total}`
  );
  // Example: pre-authorise card, check for fraud signals…
}

/**
 * onCronDaily
 * Called once per day by the cron scheduler.
 * Use this to reconcile transactions, generate reports, etc.
 *
 * @param {object} payload  - Cron context (timestamp, etc.)
 */
async function onCronDaily(payload) {
  console.info(`[PaymentGateway] cron.daily — Running daily reconciliation`);
  // Example: pull settlement report from gateway, match with invoices…
}

module.exports = { onInvoicePaid, onOrderCreated, onCronDaily };
