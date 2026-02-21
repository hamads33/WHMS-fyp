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
const prisma = require("../../../../prisma");
const TokenService = require("../services/token.service");
const AuthService = require("../services/auth.service");
const EmailTokenService = require("../services/emailToken.service");

console.log("AuthController keys:", Object.keys(AuthController));

const router = Router();

/* -------------------------------------------------------
   PUBLIC AUTH ROUTES
------------------------------------------------------- */

// Registration (rate-limited)
router.post("/register", registerLimiter, AuthController.register);

// Developer registration — creates user + assigns developer role
router.post("/register/developer", registerLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Create the user (assigns client role by default)
    const user = await AuthService.register({ email, password });

    // Also assign the developer role
    const developerRole = await prisma.role.findUnique({ where: { name: "developer" } });
    if (developerRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: developerRole.id },
      }).catch(() => {}); // ignore if already assigned
    }

    // Optionally store display name
    if (name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name },
      }).catch(() => {});
    }

    // Send verification email
    await EmailTokenService.sendVerificationEmail(user, process.env.FRONTEND_ORIGIN);

    return res.status(201).json({
      message: "Developer registration successful. Please verify your email.",
      user,
    });
  } catch (err) {
    console.error("DEVELOPER REGISTER ERROR:", err.message);
    return res.status(400).json({ error: err.message });
  }
});

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

    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    };

    // Back up admin token so we can restore it on stop
    res.cookie("_admin_token", req.auth.token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24,
    });

    // Replace session cookie with impersonation token
    res.cookie("access_token", result.accessToken, {
      ...cookieOptions,
      maxAge: parseInt(process.env.IMPERSONATION_TTL_MINUTES || "60") * 60 * 1000,
    });

    return res.json({
      success: true,
      sessionId: result.session.id,
      targetUser: {
        id: result.targetUser.id,
        email: result.targetUser.email,
        roles: result.targetUser.roles,
      },
      message: `Now impersonating ${result.targetUser.email}`,
    });
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

    // sessionId is resolved from the current access token by authGuard
    const sessionId = req.user.sessionId;
    if (!sessionId) {
      return res.status(400).json({ error: "Cannot identify impersonation session" });
    }

    await ImpersonationService.stopImpersonation({
      adminUserId: req.user.impersonatorId,
      sessionId,
    });

    const cookieOptions = { httpOnly: true, secure: false, sameSite: "lax", path: "/" };
    let restored = false;

    // Use refresh_token to issue a fresh admin access token (admin JWT may have expired)
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      const payload = TokenService.verifyRefreshToken(refreshToken);
      // Ensure this is the admin's refresh token (no impersonatorId in payload)
      if (payload?.userId && !payload.impersonatorId) {
        const newAccessToken = TokenService.signAccessToken({ userId: payload.userId });
        await prisma.session.create({
          data: {
            userId: payload.userId,
            token: newAccessToken,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            ip: req.ip || null,
            userAgent: req.headers["user-agent"] || null,
            lastActivity: new Date(),
          },
        });
        res.cookie("access_token", newAccessToken, { ...cookieOptions, maxAge: 1000 * 60 * 15 });
        restored = true;
      }
    }

    // Fallback: restore backed-up admin token (may be expired if >15m)
    if (!restored) {
      const adminToken = req.cookies?._admin_token;
      if (adminToken) {
        res.cookie("access_token", adminToken, { ...cookieOptions, maxAge: 1000 * 60 * 15 });
      }
    }

    res.clearCookie("_admin_token", { path: "/" });
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
