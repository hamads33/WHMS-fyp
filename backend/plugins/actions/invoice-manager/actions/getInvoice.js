
// ============================================
// FILE: actions/getInvoice.js
// ============================================

/**
 * Retrieve invoice details with caching
 */
module.exports.handler = async function({ meta, logger }) {
  try {
    logger.info("🔍 Fetching invoice...");

    const { invoiceId } = meta;

    if (!invoiceId) throw new Error("invoiceId is required");

    // Simulate database fetch
    const invoice = {
      id: invoiceId,
      invoiceNumber: invoiceId,
      clientId: "client-123",
      items: [
        { id: "item-1", description: "Service A", quantity: 2, unitPrice: 100 },
        { id: "item-2", description: "Service B", quantity: 1, unitPrice: 250 }
      ],
      subtotal: 450,
      tax: 45,
      total: 495,
      status: "draft",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      notes: "Thank you for your business!"
    };

    logger.info(`✅ Invoice ${invoiceId} retrieved`);

    return {
      success: true,
      invoice,
      metadata: {
        fetchedAt: new Date().toISOString(),
        cached: false
      }
    };
  } catch (error) {
    logger.error("❌ Get invoice failed: " + error.message);
    return {
      success: false,
      error: error.message,
      code: "GET_INVOICE_FAILED"
    };
  }
};
