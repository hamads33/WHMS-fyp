/**
 * ADMIN ORDER ROUTES
 * Base mount: /api/admin/orders
 */

const express = require("express");
const adminRouter = express.Router();

const controller = require("../controllers/order.controller");

// List all orders
adminRouter.get("/", controller.adminListOrders);

// Get order statistics
adminRouter.get("/stats", controller.getOrderStats);

// Get specific order
adminRouter.get("/:id", controller.getOrder);

// Activate pending order
adminRouter.post("/:id/activate", controller.activateOrder);

// Renew order
adminRouter.post("/:id/renew", controller.renewOrder);

// Suspend active order
adminRouter.post("/:id/suspend", controller.suspendOrder);

// Resume suspended order
adminRouter.post("/:id/resume", controller.resumeOrder);

// Terminate order (terminal state)
adminRouter.post("/:id/terminate", controller.terminateOrder);

module.exports = adminRouter;
