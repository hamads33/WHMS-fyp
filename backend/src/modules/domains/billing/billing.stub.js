/**
 * Billing integration boundary for the domain module.
 *
 * When billing-core plugin is loaded, delegates to the real
 * BillingService.createManualInvoice() so a proper billing record
 * is created for every domain registration. Domain registration
 * always proceeds regardless of payment status — the admin manages
 * collection via the billing UI.
 *
 * Falls back to a mock invoice if billing-core is not available.
 */

const serviceContainer = require("../../../../core/plugin-system/service.container");

async function createInvoice({ ownerId, domain, amount, currency, description }) {
  try {
    const billingService = serviceContainer.get("billing:billing");

    if (billingService && amount != null) {
      const invoice = await billingService.createManualInvoice(
        {
          clientId : ownerId,
          currency,
          lineItems: [
            {
              description,
              quantity : 1,
              unitPrice: amount / 100, // pennies → dollars for billing service
              total    : amount / 100,
            },
          ],
          status: "unpaid",
          notes : `Auto-generated for domain registration: ${domain}`,
        },
        "system"
      );

      return {
        invoiceId      : invoice.id,
        invoiceNumber  : invoice.invoiceNumber,
        status         : "paid",   // domain registration always proceeds
        amount,
        currency,
        createdAt      : new Date(),
      };
    }
  } catch (err) {
    console.warn("[billing.stub] Real billing unavailable, using mock:", err.message);
  }

  // Fallback: mock invoice (billing-core not loaded or amount unknown)
  return {
    invoiceId : `inv_mock_${Date.now()}`,
    status    : "paid",
    amount,
    currency,
    createdAt : new Date(),
  };
}

module.exports = { createInvoice };
