// ============================================================================
// FILE 1: client.order.routes.js
// ============================================================================
// Path: src/modules/orders/routes/client.order.routes.js

const router = require("express").Router();
const controller = require("../controllers/order.controller");

// FR-ORD-01: Create new order
router.post("/", controller.createOrder);

// FR-ORD-02: List all client orders
router.get("/", controller.listClientOrders);

// FR-ORD-03: Get specific order details
router.get("/:id", controller.getOrder);

// FR-ORD-06: Renew order (client can renew their own active orders)
router.post("/:id/renew", controller.renewOrder);

// Client cancellation (for pending orders only)
router.post("/:id/cancel", controller.cancelOrder);

module.exports = router;