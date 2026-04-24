/**
 * CLIENT ORDER ROUTES (ENHANCED)
 * Path: src/modules/orders/routes/client.order.routes.js
 *
 * ⚠️ REPLACE YOUR EXISTING FILE WITH THIS VERSION
 *
 * Base mount: /api/client/orders
 *
 * Updated for Professional Services Module:
 * - Add-on support in create endpoint
 * - Cost breakdown responses
 * - Detailed order view
 */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/order.controller");
const authGuard = require("../../auth/middlewares/auth.guard");

// ============================================================
// ORDER CREATION & LISTING
// ============================================================

/**
 * Create new order
 * POST /api/client/orders
 *
 * Body:
 * {
 *   serviceId: string,
 *   planId: string,
 *   pricingId: string,
 *   addons: [ { addonId: string, quantity: number } ],
 *   billingCycles: number,
 *   quantity: number
 * }
 *
 * Response: { order, costBreakdown }
 */
router.post("/", authGuard, controller.createOrder);

/**
 * List client's orders
 * GET /api/client/orders
 *
 * Query params:
 * - limit=50 (default)
 * - offset=0 (default)
 * - status=pending|active|suspended|terminated|cancelled
 *
 * Response: { orders }
 */
router.get("/", authGuard, controller.listClientOrders);

// ============================================================
// SPECIFIC ORDER OPERATIONS
// ============================================================

/**
 * Get client's total spend
 * GET /api/client/orders/spend
 *
 * Response: { totalOrders, totalSpend, orders[] }
 */
router.get("/spend", authGuard, controller.getClientSpend);

/**
 * Get specific order
 * GET /api/client/orders/:id
 *
 * Response: { order, costBreakdown }
 */
router.get("/:id", authGuard, controller.getOrder);

/**
 * Get order details with add-ons
 * GET /api/client/orders/:id/details
 *
 * Response: {
 *   order with snapshot including:
 *   - service info
 *   - plan info
 *   - pricing with setup/renewal fees
 *   - addons array
 *   - features
 *   - policies
 *   - costBreakdown
 * }
 */
router.get("/:id/details", authGuard, controller.getOrderDetails);

// ============================================================
// ORDER ACTIONS (CLIENT)
// ============================================================

/**
 * Cancel pending order
 * POST /api/client/orders/:id/cancel
 *
 * Only pending orders can be cancelled
 */
router.post("/:id/cancel", authGuard, controller.cancelOrder);

/**
 * Renew active order
 * POST /api/client/orders/:id/renew
 *
 * Extends renewal date to next billing period
 */
router.post("/:id/renew", authGuard, controller.renewOrder);

module.exports = router;