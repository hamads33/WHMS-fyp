/**
 * Order Controller - Clean & Lightweight
 * Path: src/modules/orders/controllers/order.controller.js
 */

const orderService = require("../services/order.service");

function getUserContext(req) {
  // Ensure req.user exists and has an id
  if (!req.user || !req.user.id) {
    const err = new Error("User not authenticated");
    err.statusCode = 401;
    throw err;
  }
  return req.user;
}

/**
 * Create a new order
 * POST /api/orders
 */
exports.createOrder = async (req, res) => {
  try {
    const user = getUserContext(req);
    const order = await orderService.createOrder(user.id, req.body);

    res.status(201).json(order);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to create order",
    });
  }
};

/**
 * List client's orders
 * GET /api/orders
 */
exports.listClientOrders = async (req, res) => {
  try {
    const { limit, offset, status } = req.query;
    const orders = await orderService.getClientOrders(req.user.id, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      status,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch client orders",
    });
  }
};

/**
 * Get specific order
 * GET /api/orders/:id
 */
exports.getOrder = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id, {
      role: req.user.role,
      userId: req.user.id,
    });
    res.json(order);
  } catch (err) {
    res.status(err.statusCode || 404).json({
      success: false,
      error: err.message || "Order not found",
    });
  }
};

/**
 * Cancel pending order (client only)
 * POST /api/orders/:id/cancel
 */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await orderService.cancel(req.params.id, req.user.id);
    res.json(order);
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
    res.json(order);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to activate order",
    });
  }
};

/**
 * Renew active order
 * POST /api/orders/:id/renew (client)
 * POST /api/admin/orders/:id/renew (admin)
 */
exports.renewOrder = async (req, res) => {
  try {
    const order = await orderService.renew(req.params.id);
    res.json(order);
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
    const order = await orderService.suspend(req.params.id);
    res.json(order);
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
    res.json(order);
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
    const order = await orderService.terminate(req.params.id);
    res.json(order);
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
 */
exports.adminListOrders = async (req, res) => {
  try {
    const { limit, offset, status, clientId } = req.query;
    const orders = await orderService.adminListOrders({
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
      status,
      clientId,
    });
    res.json(orders);
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
    res.json(stats);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch order statistics",
    });
  }
};

/**
 * Get client's total spend
 * GET /api/orders/spend
 */
exports.getClientSpend = async (req, res) => {
  try {
    const spend = await orderService.getClientTotalSpend(req.user.id);
    res.json(spend);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch spend information",
    });
  }
};