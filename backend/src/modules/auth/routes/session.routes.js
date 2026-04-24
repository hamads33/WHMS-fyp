// src/modules/auth/routes/session.routes.js
// UPDATED: All session routes properly implemented

const { Router } = require("express");
const authGuard = require("../middlewares/auth.guard");
const impersonationMiddleware = require("../middlewares/impersonation.middleware");
const SessionController = require("../controllers/session.controller");

const router = Router();

/**
 * 🔐 SESSION MANAGEMENT ROUTES
 * All routes require authentication
 */

/**
 * GET /api/auth/session/current
 * Get current authenticated session context (portal, roles, permissions)
 */
router.get(
  "/current",
  authGuard,
  impersonationMiddleware,
  SessionController.getCurrentSession
);

/**
 * GET /api/auth/session
 * List all active sessions for current user
 */
router.get(
  "/",
  authGuard,
  SessionController.listSessions
);

/**
 * GET /api/auth/session/security/logs
 * Get login attempt logs (success & failed attempts)
 */
router.get(
  "/security/logs",
  authGuard,
  SessionController.securityLogs
);

/**
 * ⚠️  ORDER MATTERS — specific routes BEFORE /:sessionId
 * DELETE /api/auth/session/others/all
 * Revoke all sessions except current
 */
router.delete(
  "/others/all",
  authGuard,
  SessionController.revokeOtherSessions
);

/**
 * DELETE /api/auth/session/:sessionId
 * Revoke a specific session by ID
 */
router.delete(
  "/:sessionId",
  authGuard,
  SessionController.revokeSession
);

module.exports = router;