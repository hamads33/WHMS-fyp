/**
 * CLIENT ORDER ROUTES
 * Base mount: /api/client/orders
 */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/order.controller");
const authGuard = require("../../auth/middlewares/auth.guard");
// Create new order
router.post("/",authGuard, controller.createOrder);

// List client's orders
router.get("/",authGuard, controller.listClientOrders);

// Get client's total spend (STATIC FIRST)
router.get("/spend",authGuard, controller.getClientSpend);

// Get specific order
router.get("/:id",authGuard, controller.getOrder);

// Cancel pending order
router.post("/:id/cancel",authGuard, controller.cancelOrder);

// Renew active order
router.post("/:id/renew",authGuard, controller.renewOrder);

module.exports = router;
