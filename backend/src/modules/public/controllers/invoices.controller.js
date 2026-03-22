/**
 * Public Invoices Controller
 * GET /public/v1/invoices/:id
 *
 * Requires a valid client Bearer token.
 * Client can only access their own invoices.
 */
const InvoiceService = require("../../billing/services/invoice.service");
const PaymentService = require("../../billing/services/payment.service");

const InvoicesController = {
  /**
   * POST /public/v1/invoices/:id/pay
   * Body: { gateway: "manual"|"stripe"|"paypal", gatewayRef?, amount? }
   *
   * Allows a client to record/initiate payment for their invoice.
   */
  async pay(req, res) {
    try {
      const clientId = req.publicClientId;
      if (!clientId) {
        return res.status(401).json({ error: "Client authentication required" });
      }

      const invoice = await InvoiceService.getById(req.params.id);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (invoice.clientId !== clientId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { gateway = "manual", gatewayRef, amount } = req.body;

      // If a real gateway is requested, initiate a checkout session
      if (gateway === "stripe" || gateway === "paypal") {
        const session = await PaymentService.initiateGatewayPayment(
          req.params.id,
          gateway,
          req.body,
          clientId
        );
        return res.json({ success: true, ...session });
      }

      // Manual / direct payment recording
      const paymentAmount = amount || invoice.amountDue;
      const result = await PaymentService.create(
        req.params.id,
        { amount: paymentAmount, gateway, gatewayRef },
        clientId
      );

      return res.json({ success: true, payment: result.payment, invoice: result.invoice });
    } catch (err) {
      const status = err.statusCode || 500;
      return res.status(status).json({ error: err.message || "Payment failed" });
    }
  },

  async getById(req, res) {
    try {
      const clientId = req.publicClientId;
      if (!clientId) {
        return res.status(401).json({ error: "Client authentication required" });
      }

      const invoice = await InvoiceService.getById(req.params.id);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Enforce ownership — clients may only read their own invoices
      if (invoice.clientId !== clientId) {
        return res.status(403).json({ error: "Access denied" });
      }

      return res.json({ success: true, invoice });
    } catch (err) {
      const status = err.statusCode || 500;
      return res.status(status).json({ error: err.message || "Failed to fetch invoice" });
    }
  },
};

module.exports = InvoicesController;
