// Path: src/modules/orders/routes/admin.order.routes.js

const router = require("express").Router();
const controller = require("../controllers/order.controller");

// FR-ORD-04: List all orders (admin)
router.get("/orders", controller.adminListOrders);

// FR-ORD-03: Get specific order details (admin can access any)
router.get("/orders/:id", controller.getOrder);

// FR-ORD-05: Activate pending order (admin only)
router.post("/orders/:id/activate", controller.activateOrder);

// FR-ORD-06: Renew order (admin action)
router.post("/orders/:id/renew", controller.renewOrder);

// FR-ORD-07: Suspend order (admin only)
router.post("/orders/:id/suspend", controller.suspendOrder);

// FR-ORD-08: Resume order (admin only)
router.post("/orders/:id/resume", controller.resumeOrder);

// FR-ORD-09: Terminate order (admin only - terminal state)
router.post("/orders/:id/terminate", controller.terminateOrder);

module.exports = router;
