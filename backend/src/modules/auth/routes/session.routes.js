const { Router } = require("express");
const authGuard  = require("../middlewares/auth.guard");
const SessionController = require("../controllers/session.controller");

const router = Router();

// List all devices/sessions
router.get("/", authGuard, SessionController.listSessions);

// Revoke a specific session
router.delete("/:sessionId", authGuard, SessionController.revokeSession);

// Revoke all other sessions
router.delete("/others/all", authGuard, SessionController.revokeOtherSessions);

// View security logs
router.get("/security/logs", authGuard, SessionController.securityLogs);

module.exports = router;
