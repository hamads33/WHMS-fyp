

// ============================================================================
// FILE 3: order.controller.js
// ============================================================================
// Path: src/modules/orders/controllers/order.controller.js

const orderService = require("../services/order.service");

/**
 * Create a new order (Client)
 * Status: pending
 */
exports.createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.user.id, req.body);
    res.status(201).json(order);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || "Failed to create order",
    });
  }
};

/**
 * List orders for authenticated client
 */
exports.listClientOrders = async (req, res) => {
  try {
    const orders = await orderService.getClientOrders(req.user.id);
    res.json(orders);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch client orders",
    });
  }
};

/**
 * Get single order (Client or Admin)
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
 * Cancel order (Client - pending orders only)
 * pending → cancelled
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
 * Activate order (Admin / system action)
 * pending → active
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
 * Renew order (Client or Admin)
 * active → active (extends renewal date)
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
 * Suspend order (Admin / automation)
 * active → suspended
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
 * Resume order (Admin)
 * suspended → active
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
 * Terminate order (Admin)
 * * → terminated (terminal)
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
 * List all orders (Admin)
 */
exports.adminListOrders = async (req, res) => {
  try {
    const orders = await orderService.adminListOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch orders",
    });
  }
};

