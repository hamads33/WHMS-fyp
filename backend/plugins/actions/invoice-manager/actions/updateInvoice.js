
// ============================================
// FILE: actions/updateInvoice.js
// ============================================

/**
 * Update invoice with validation
 */
module.exports.handler = async function({ meta, logger }) {
  try {
    logger.info("✏️ Updating invoice...");

    const { invoiceId, updates = {} } = meta;

    if (!invoiceId) throw new Error("invoiceId is required");

    // Validate updates
    const allowedFields = ["notes", "dueDate", "items", "status"];
    const validUpdates = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        validUpdates[key] = value;
      }
    }

    logger.info(`✅ Invoice ${invoiceId} updated with ${Object.keys(validUpdates).length} fields`);

    return {
      success: true,
      message: "Invoice updated successfully",
      invoice: {
        id: invoiceId,
        ...validUpdates,
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error("❌ Update invoice failed: " + error.message);
    return {
      success: false,
      error: error.message,
      code: "UPDATE_INVOICE_FAILED"
    };
  }
};
