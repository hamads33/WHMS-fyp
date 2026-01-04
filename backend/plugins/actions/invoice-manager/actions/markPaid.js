
// ============================================
// FILE: actions/markPaid.js
// ============================================

/**
 * Mark invoice as paid and trigger webhooks
 */
module.exports.handler = async function({ meta, logger, registry }) {
  try {
    logger.info("💳 Processing payment...");

    const { invoiceId, paymentDate = new Date().toISOString(), paymentRef = null } = meta;

    if (!invoiceId) throw new Error("invoiceId is required");

    const paymentRecord = {
      invoiceId,
      paymentDate,
      paymentRef,
      processedAt: new Date().toISOString(),
      status: "completed"
    };

    logger.info(`✅ Invoice ${invoiceId} marked as paid`);

    // Trigger webhook if registry available
    if (registry && registry.getHooks) {
      const hooks = registry.getHooks("payment:received");
      logger.info(`🔔 Triggering ${hooks.length} payment hooks...`);
    }

    return {
      success: true,
      message: "Invoice marked as paid",
      payment: paymentRecord
    };
  } catch (error) {
    logger.error("❌ Mark paid failed: " + error.message);
    return {
      success: false,
      error: error.message,
      code: "MARK_PAID_FAILED"
    };
  }
};
