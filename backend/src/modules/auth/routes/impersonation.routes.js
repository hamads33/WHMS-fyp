const { Router } = require("express");

const authGuard = require("../middlewares/auth.guard.js");
const adminPortalGuard = require("../guards/adminPortal.guard.js");

const ImpersonationController = require("../controllers/impersonation.controller.js");

const router = Router();

/**
 * ADMIN PORTAL ROUTES
 * Must be protected by:
 * 1. User authenticated (authGuard)
 * 2. Has admin portal role (adminPortalGuard)
 */

router.post("/start", authGuard, adminPortalGuard, ImpersonationController.start);
router.post("/stop", authGuard, adminPortalGuard, ImpersonationController.stop);
router.get("/list", authGuard, adminPortalGuard, ImpersonationController.list);

module.exports = router;
