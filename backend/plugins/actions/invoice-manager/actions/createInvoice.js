
// ============================================
// FILE: actions/createInvoice.js
// ============================================

/**
 * Create a new invoice
 * @param {Object} context - Plugin execution context
 * @param {Object} context.meta - Request metadata
 * @param {Object} context.prisma - Database client
 * @param {Object} context.logger - Logger instance
 * @param {string} context.meta.clientId - Client identifier
 * @param {Array} context.meta.items - Invoice line items
 * @param {string} context.meta.dueDate - Payment due date
 */
module.exports.handler = async function({ meta, prisma, logger }) {
  try {
    logger.info("📝 Creating new invoice...");

    const { clientId, items = [], dueDate, notes = "" } = meta;

    // Validation
    if (!clientId) throw new Error("clientId is required");
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("items array is required and must not be empty");
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const taxRate = 0.1; // 10% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create invoice record
    const invoice = {
      id: invoiceNumber,
      clientId,
      invoiceNumber,
      items,
      subtotal,
      tax,
      total,
      status: "draft",
      dueDate: new Date(dueDate),
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        createdBy: "plugin",
        source: "invoice-manager"
      }
    };

    logger.info(`✅ Invoice created: ${invoiceNumber}`);

    return {
      success: true,
      message: "Invoice created successfully",
      invoice,
      summary: {
        invoiceId: invoiceNumber,
        amount: total,
        itemCount: items.length,
        status: "draft"
      }
    };
  } catch (error) {
    logger.error("❌ Create invoice failed: " + error.message);
    return {
      success: false,
      error: error.message,
      code: "CREATE_INVOICE_FAILED"
    };
  }
};
