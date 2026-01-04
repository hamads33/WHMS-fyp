
// ============================================
// FILE: actions/hooks/onInvoiceCreated.js
// ============================================

/**
 * Hook triggered when invoice is created
 */
module.exports.handler = async function({ meta, logger }) {
  logger.info("🪝 Hook: Invoice created");
  logger.info(`Invoice ID: ${meta.invoiceId}, Amount: ${meta.amount}`);

  // Send notifications, update analytics, etc.
  return {
    success: true,
    hookExecuted: true,
    event: "invoice:created"
  };
};