/**
 * CLIENT ORDER ROUTES
 * Base mount: /api/client/orders
 */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/order.controller");

// Create new order
router.post("/", controller.createOrder);

// List client's orders
router.get("/", controller.listClientOrders);

// Get client's total spend (STATIC FIRST)
router.get("/spend", controller.getClientSpend);

// Get specific order
router.get("/:id", controller.getOrder);

// Cancel pending order
router.post("/:id/cancel", controller.cancelOrder);

// Renew active order
router.post("/:id/renew", controller.renewOrder);

module.exports = router;
