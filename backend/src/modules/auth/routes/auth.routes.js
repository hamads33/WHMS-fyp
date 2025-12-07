const { Router } = require("express");

// Debug logs for Jest
console.log(
  "🟦 DEBUG AUTH ROUTES LOADED — controller export:",
  require("../controllers/auth.controller.js")
);

// Controllers
const AuthController = require("../controllers/auth.controller.js");
const EmailController = require("../controllers/email.controller.js");

// Middleware
const authGuard = require("../middlewares/auth.guard.js");

// Rate limiters
const {
  loginLimiter,
  registerLimiter,
  verifyLimiter,
} = require("../middlewares/rateLimit.js");

// Impersonation
const ImpersonationService = require("../services/impersonation.service");

console.log("AuthController keys:", Object.keys(AuthController));

const router = Router();

/* -------------------------------------------------------
   PUBLIC AUTH ROUTES
------------------------------------------------------- */

// Registration (rate-limited)
router.post("/register", registerLimiter, AuthController.register);

// Login (rate-limited)
router.post("/login", loginLimiter, AuthController.login);

// Token refresh (public)
router.post("/refresh", AuthController.refresh);

// Logout (public, uses refresh token)
router.post("/logout", AuthController.logout);

/* -------------------------------------------------------
   EMAIL VERIFICATION ROUTES
------------------------------------------------------- */

// Send verification email (rate-limited)
router.post(
  "/email/send",
  verifyLimiter,
  EmailController.sendVerificationEmail
);

// Verify email link
router.get("/email/verify", EmailController.verifyEmailToken);

/* -------------------------------------------------------
   PROTECTED ROUTES
------------------------------------------------------- */

// Current user
router.get("/me", authGuard, AuthController.me);

/* -------------------------------------------------------
   IMPERSONATION ROUTES (Admin Only)
------------------------------------------------------- */

// ⭐ Start impersonation
router.post("/impersonate/start", authGuard, async (req, res) => {
  try {
    const { targetUserId, reason } = req.body;

    const result = await ImpersonationService.startImpersonation({
      adminUser: req.user,
      targetUserId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      reason,
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ⭐ Stop impersonation
router.post("/impersonate/stop", authGuard, async (req, res) => {
  try {
    if (!req.user.impersonatorId) {
      return res.status(400).json({ error: "Not in impersonation mode" });
    }

    const { sessionId } = req.body;

    await ImpersonationService.stopImpersonation({
      adminUserId: req.user.impersonatorId,
      sessionId,
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ⭐ List impersonation sessions for this admin
router.get("/impersonate/list", authGuard, async (req, res) => {
  try {
    const sessions = await ImpersonationService.listImpersonationsByAdmin(
      req.user.id
    );

    return res.json({ success: true, sessions });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ⭐ Impersonation Status
router.get("/impersonation-status", authGuard, (req, res) => {
  return res.json({
    isImpersonation: !!req.user.impersonatorId,
    impersonatorId: req.user.impersonatorId || null,
  });
});

module.exports = router;
