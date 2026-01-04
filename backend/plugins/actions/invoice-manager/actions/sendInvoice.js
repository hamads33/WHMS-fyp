
// ============================================
// FILE: actions/sendInvoice.js
// ============================================

/**
 * Send invoice via email with retry logic
 */
module.exports.handler = async function({ meta, logger }) {
  try {
    logger.info("📧 Preparing invoice for delivery...");

    const { invoiceId, recipientEmail, subject = null } = meta;

    if (!invoiceId) throw new Error("invoiceId is required");
    if (!recipientEmail) throw new Error("recipientEmail is required");

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      throw new Error("Invalid email format");
    }

    // Retry logic
    const maxRetries = 3;
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
      attempt++;
      try {
        logger.info(`📤 Sending email attempt ${attempt}/${maxRetries}...`);

        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 100));

        logger.info(`✅ Invoice ${invoiceId} sent to ${recipientEmail}`);

        return {
          success: true,
          message: "Invoice sent successfully",
          email: {
            to: recipientEmail,
            invoiceId,
            sentAt: new Date().toISOString(),
            attempts: attempt,
            subject: subject || `Invoice ${invoiceId}`
          }
        };
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          logger.warn(`⚠️ Attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error("Failed to send invoice after retries");
  } catch (error) {
    logger.error("❌ Send invoice failed: " + error.message);
    return {
      success: false,
      error: error.message,
      code: "SEND_INVOICE_FAILED"
    };
  }
};
