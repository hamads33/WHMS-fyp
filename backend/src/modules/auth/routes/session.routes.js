
const { Router } = require("express");
const authGuard = require("../middlewares/auth.guard");
const impersonationMiddleware = require("../middlewares/impersonation.middleware");
const SessionController = require("../controllers/session.controller");

const router = Router();

/**
 * 🔐 CURRENT AUTH SESSION (FRONTEND USE)
 * GET /api/auth/session
 */
router.get(
  "/current",
  authGuard,
  impersonationMiddleware,
  SessionController.getCurrentSession
);

/**
 * 📱 SESSION MANAGEMENT (DEVICES)
 */
router.get("/", authGuard, SessionController.listSessions);

/**
 * ⚠️ ORDER MATTERS — specific routes FIRST
 */
router.delete("/others/all", authGuard, SessionController.revokeOtherSessions);
router.delete("/:sessionId", authGuard, SessionController.revokeSession);

/**
 * 🔍 SECURITY LOGS
 */
router.get("/security/logs", authGuard, SessionController.securityLogs);

module.exports = router;
