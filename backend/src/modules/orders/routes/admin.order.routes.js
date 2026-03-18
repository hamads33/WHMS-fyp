/**
 * ADMIN ORDER ROUTES (ENHANCED)
 * Path: src/modules/orders/routes/admin.order.routes.js
 *
 * ⚠️ REPLACE YOUR EXISTING FILE WITH THIS VERSION
 *
 * Base mount: /api/admin/orders
 *
 * Updated for Professional Services Module:
 * - Order statistics and filtering
 * - Complete order lifecycle management
 * - Service integration
 */

const express = require("express");
const adminRouter = express.Router();
const controller = require("../controllers/order.controller");

// ============================================================
// ORDER LISTING & STATISTICS
// ============================================================

/**
 * Get order statistics
 * GET /api/admin/orders/stats
 *
 * Returns count of orders by status:
 * { pending, active, suspended, terminated, cancelled }
 */
adminRouter.get("/stats", controller.getOrderStats);

/**
 * List all orders
 * GET /api/admin/orders
 *
 * Query params:
 * - limit=100 (default)
 * - offset=0 (default)
 * - status=pending|active|suspended|terminated|cancelled
 * - clientId=string (filter by client)
 *
 * Response: { orders }
 */
adminRouter.get("/", controller.adminListOrders);

// ============================================================
// SPECIFIC ORDER OPERATIONS
// ============================================================

/**
 * Get specific order
 * GET /api/admin/orders/:id
 *
 * Response: { order, costBreakdown }
 */
adminRouter.get("/:id", controller.getOrder);

/**
 * Get order details with add-ons and automations
 * GET /api/admin/orders/:id/details
 *
 * Response: {
 *   order with complete snapshot:
 *   - service info with moduleName
 *   - plan info with customizeOption
 *   - pricing with all fee types
 *   - addons array
 *   - features mapping
 *   - policies
 *   - costBreakdown with addon costs
 * }
 */
adminRouter.get("/:id/details", controller.getOrderDetails);

// ============================================================
// ORDER STATE TRANSITIONS
// ============================================================

/**
 * Activate pending order
 * POST /api/admin/orders/:id/activate
 *
 * Transitions: pending → active
 * - Sets startedAt timestamp
 * - Calculates nextRenewalAt based on billing cycle
 * - Triggers provisioning automation
 */
adminRouter.post("/:id/activate", controller.activateOrder);

/**
 * Renew active order
 * POST /api/admin/orders/:id/renew
 *
 * Extends renewal date to next billing period
 * Works for both active and suspended orders
 */
adminRouter.post("/:id/renew", controller.renewOrder);

/**
 * Suspend active order
 * POST /api/admin/orders/:id/suspend
 *
 * Transitions: active → suspended
 * Optional body: { reason: string }
 *
 * Triggers suspension automation and may apply suspension fee
 */
adminRouter.post("/:id/suspend", controller.suspendOrder);

/**
 * Resume suspended order
 * POST /api/admin/orders/:id/resume
 *
 * Transitions: suspended → active
 * Re-activates the service
 */
adminRouter.post("/:id/resume", controller.resumeOrder);

/**
 * Terminate order (terminal state)
 * POST /api/admin/orders/:id/terminate
 *
 * Transitions: * → terminated
 * Optional body: { reason: string }
 *
 * Terminal state - cannot be reversed
 * Triggers termination automation and may apply termination fee
 */
adminRouter.post("/:id/terminate", controller.terminateOrder);

/**
 * Manually provision an order
 * POST /api/admin/orders/:id/provision
 *
 * For use when auto-provisioning is disabled.
 * Order must be in 'active' status.
 */
adminRouter.post("/:id/provision", controller.provisionOrder);

module.exports = adminRouter;