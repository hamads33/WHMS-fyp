/**
 * Order Controller (ENHANCED)
 * Path: src/modules/orders/controllers/order.controller.js
 *
 * ⚠️ REPLACE YOUR EXISTING FILE WITH THIS VERSION
 *
 * Updated for Professional Services Module:
 * - Returns cost breakdown in responses
 * - Supports add-on selection
 * - Enhanced error handling
 */

const orderService = require("../services/order.service");

function getUserContext(req) {
  if (!req.user || !req.user.id) {
    const err = new Error("User not authenticated");
    err.statusCode = 401;
    throw err;
  }
  return req.user;
}

/**
 * Create a new order
 * POST /api/client/orders
 *
 * Request body:
 * {
 *   serviceId: string,
 *   planId: string,
 *   pricingId: string,
 *   addons: [ { addonId: string, quantity: number } ],
 *   billingCycles: number,
 *   quantity: number
 * }
 */
exports.createOrder = async (req, res) => {
  try {
    const user = getUserContext(req);
    const result = await orderService.createOrder(user.id, req.body);

    res.status(201).json({
      success: true,
      order: result.order,
      invoice: result.invoice ?? null,
      costBreakdown: result.costBreakdown,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to create order",
    });
  }
};

/**
 * List client's orders
 * GET /api/client/orders
 *
 * Query params:
 * - limit: number (default 50)
 * - offset: number (default 0)
 * - status: string (pending, active, suspended, terminated, cancelled)
 */
exports.listClientOrders = async (req, res) => {
  try {
    const { limit, offset, status } = req.query;
    const orders = await orderService.getClientOrders(req.user.id, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      status,
    });

    // Add cost breakdown to each order
    const enrichedOrders = orders.map((order) => ({
      ...order,
      costBreakdown: {
        baseCost: order.snapshot?.pricing?.price || "0",
        currency: order.snapshot?.pricing?.currency || "USD",
      },
    }));

    res.json({
      success: true,
      count: orders.length,
      orders: enrichedOrders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch client orders",
    });
  }
};

/**
 * Get specific order with full details
 * GET /api/client/orders/:id
 * GET /api/admin/orders/:id
 */
exports.getOrder = async (req, res) => {
  try {
    const requester = req.user || { role: "admin", userId: null };
    const order = await orderService.getOrderById(req.params.id, requester);

    res.json({
      success: true,
      ...order,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Order not found",
    });
  }
};

/**
 * Get order details with add-ons and cost breakdown
 * GET /api/client/orders/:id/details
 */
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await orderService.getOrderDetails(req.params.id);

    // Verify ownership for clients
    if (req.user?.role === "client" && order.clientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: You can only access your own orders",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    res.status(err.statusCode || 404).json({
      success: false,
      error: err.message || "Order not found",
    });
  }
};

/**
 * Cancel pending order (client only)
 * POST /api/client/orders/:id/cancel
 */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await orderService.cancel(req.params.id, req.user.id);

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to cancel order",
    });
  }
};

/**
 * Activate pending order (admin action)
 * POST /api/admin/orders/:id/activate
 */
exports.activateOrder = async (req, res) => {
  try {
    const order = await orderService.activate(req.params.id);

    res.json({
      success: true,
      message: "Order activated successfully",
      order,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to activate order",
    });
  }
};

/**
 * Renew active order
 * POST /api/client/orders/:id/renew (client)
 * POST /api/admin/orders/:id/renew (admin)
 */
exports.renewOrder = async (req, res) => {
  try {
    const order = await orderService.renew(req.params.id);

    res.json({
      success: true,
      message: "Order renewed successfully",
      nextRenewalAt: order.nextRenewalAt,
      order,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to renew order",
    });
  }
};

/**
 * Suspend active order (admin action)
 * POST /api/admin/orders/:id/suspend
 */
exports.suspendOrder = async (req, res) => {
  try {
    const reason = req.body?.reason || "Payment required";
    const order = await orderService.suspend(req.params.id, reason);

    res.json({
      success: true,
      message: "Order suspended successfully",
      order,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to suspend order",
    });
  }
};

/**
 * Resume suspended order (admin action)
 * POST /api/admin/orders/:id/resume
 */
exports.resumeOrder = async (req, res) => {
  try {
    const order = await orderService.resume(req.params.id);

    res.json({
      success: true,
      message: "Order resumed successfully",
      order,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to resume order",
    });
  }
};

/**
 * Terminate order (admin action - terminal state)
 * POST /api/admin/orders/:id/terminate
 */
exports.terminateOrder = async (req, res) => {
  try {
    const reason = req.body?.reason || "Admin action";
    const order = await orderService.terminate(req.params.id, reason);

    res.json({
      success: true,
      message: "Order terminated successfully",
      order,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to terminate order",
    });
  }
};

/**
 * List all orders (admin only)
 * GET /api/admin/orders
 *
 * Query params:
 * - limit: number (default 100)
 * - offset: number (default 0)
 * - status: string
 * - clientId: string
 */
const VALID_ORDER_STATUSES = ["pending", "active", "suspended", "terminated", "cancelled"];

exports.adminListOrders = async (req, res) => {
  try {
    const { limit, offset, status, clientId } = req.query;

    if (status && !VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status value. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}`,
      });
    }

    const orders = await orderService.adminListOrders({
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
      status,
      clientId,
    });

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
};

/**
 * Get order statistics
 * GET /api/admin/orders/stats
 */
exports.getOrderStats = async (req, res) => {
  try {
    const stats = await orderService.getOrderStats();

    res.json({
      success: true,
      stats,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch order statistics",
    });
  }
};

/**
 * Get client's total spend
 * GET /api/client/orders/spend
 */
exports.getClientSpend = async (req, res) => {
  try {
    const spend = await orderService.getClientTotalSpend(req.user.id);

    res.json({
      success: true,
      ...spend,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch spend information",
    });
  }
};

/**
 * Manually provision an order (admin action)
 * POST /api/admin/orders/:id/provision
 *
 * For use when auto-provisioning is disabled.
 * Order must be active before provisioning.
 */
exports.provisionOrder = async (req, res) => {
  try {
    const provisioningService = require("../../provisioning/services/provisioning.service");
    const result = await provisioningService.provisionAccount(req.params.id);
    res.json({ success: true, provisioning: result });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: err.message || "Provisioning failed" });
  }
};
