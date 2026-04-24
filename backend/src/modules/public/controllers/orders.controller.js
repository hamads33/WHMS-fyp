/**
 * Public Orders Controller
 * POST /public/v1/orders  — create an order for the authenticated client
 *
 * Requires: Bearer token (from login) in Authorization header
 * OR session-based auth via auth middleware.
 *
 * req.clientId is set by publicClientAuth middleware.
 */
const { createOrder } = require("../../orders/services/order.service");
const prisma = require("../../../../prisma");

const OrdersController = {
  /**
   * GET /public/v1/orders/:id/invoice
   * Returns the invoice associated with an order.
   */
  async getInvoice(req, res) {
    try {
      const clientId = req.publicClientId;
      if (!clientId) return res.status(401).json({ error: "Client authentication required" });

      const order = await prisma.order.findUnique({ where: { id: req.params.id } });
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.clientId !== clientId) return res.status(403).json({ error: "Access denied" });

      const invoice = await prisma.invoice.findFirst({
        where: { orderId: req.params.id, status: { notIn: ["cancelled"] } },
        include: { lineItems: true },
        orderBy: { createdAt: "desc" },
      });

      if (!invoice) return res.status(404).json({ error: "No invoice found for this order" });
      return res.json({ success: true, invoice });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message || "Failed to fetch invoice" });
    }
  },

  async create(req, res) {
    try {
      const { serviceId, planId, pricingId, addons, billingCycles, quantity } =
        req.body;

      if (!serviceId || !planId || !pricingId) {
        return res.status(400).json({
          error: "serviceId, planId, and pricingId are required",
        });
      }

      const clientId = req.publicClientId;
      if (!clientId) {
        return res.status(401).json({ error: "Client authentication required" });
      }

      const result = await createOrder(clientId, {
        serviceId,
        planId,
        pricingId,
        addons: addons || [],
        billingCycles: billingCycles || 1,
        quantity: quantity || 1,
      });

      // Fetch invoice with line items so the SDK can show it immediately
      let invoice = null;
      if (result.invoice?.id) {
        invoice = await prisma.invoice.findUnique({
          where: { id: result.invoice.id },
          include: { lineItems: true },
        });
      }

      return res.status(201).json({
        success: true,
        order: result.order,
        invoice,
        costBreakdown: result.costBreakdown,
      });
    } catch (err) {
      const status = err.statusCode || 500;
      return res.status(status).json({ error: err.message || "Order creation failed" });
    }
  },
};

module.exports = OrdersController;
