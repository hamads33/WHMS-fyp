/**
 * Billing Stub
 * This file represents integration boundary with future billing module
 * Replace with real billing service later
 */

async function createInvoice({
  ownerId,
  domain,
  amount,
  currency,
  description
}) {
  // Simulate invoice creation
  return {
    invoiceId: `inv_${Date.now()}`,
    status: "paid", // mocked as paid for now
    amount,
    currency,
    createdAt: new Date()
  };
}

module.exports = {
  createInvoice
};
