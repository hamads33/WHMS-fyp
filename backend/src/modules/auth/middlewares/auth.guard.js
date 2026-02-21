/**
 * Auth Guard
 * -------------------------------------------------------
 * - JWT verification
 * - IP access control
 * - Session enforcement (PROD)
 * - Role & permission loading
 * - Profile context (client/admin/etc.)
 *
 * TEST MODE:
 * - Session enforcement is bypassed when NODE_ENV === "test"
 *   (used for E2E / integration tests only)
 */

const prisma = require("../../../../prisma");
const TokenService = require("../services/token.service");
const IpAccessService = require("../services/ipAccess.service");
const TrustedDeviceService = require("../services/trustedDevice.service");

/* =======================================================
   Helpers
======================================================= */

/**
 * Resolve real client IP (IPv4 / IPv6 / proxy-safe)
 */
function resolveClientIp(req) {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    "";

  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  if (ip === "::1") ip = "127.0.0.1";

  return ip;
}

/**
 * Extract access token (cookie-first, header fallback)
 */
function extractAccessToken(req) {
  return (
    req.cookies?.access_token ||
    req.cookies?.accessToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.replace("Bearer ", "").trim()
      : null)
  );
}

/* =======================================================
   Auth Guard Middleware
======================================================= */
async function authGuard(req, res, next) {
  try {
    const clientIp = resolveClientIp(req);

    /* ===================================================
       0) INTERNAL AUTOMATION BYPASS
       Service-to-service calls from the automation engine
       use X-Automation-Secret to skip JWT/session checks.
    =================================================== */
    if (process.env.AUTOMATION_SECRET) {
      const automationSecret = req.headers["x-automation-secret"];
      if (automationSecret && automationSecret === process.env.AUTOMATION_SECRET) {
        // Find first superadmin so FK constraints on createdById work correctly
        const systemUser = await prisma.user.findFirst({
          where: { roles: { some: { role: { name: "superadmin" } } } },
          select: { id: true, email: true },
        });
        req.user = {
          id: systemUser?.id || null,
          email: systemUser?.email || "automation@system.internal",
          roles: ["superadmin"],
          permissions: [],
          portals: ["admin"],
          mfaEnabled: false,
          mfaVerified: true,
          clientProfile: null,
          adminProfile: null,
          resellerProfile: null,
          developerProfile: null,
          impersonatorId: null,
          isImpersonation: false,
          sessionId: null,
          ip: clientIp,
          isSystemCall: true,
        };
        req.auth = { tokenPayload: { userId: systemUser?.id }, token: null };
        return next();
      }
    }

    /* ===================================================
       1) IP RULE BYPASS (PREVENT SELF-LOCKOUT)
    =================================================== */
    const IP_RULE_BYPASS_ROUTES = [
      "/api/ip-rules",
      "/api/admin/ip-rules",
    ];

    const isIpRuleRequest = IP_RULE_BYPASS_ROUTES.some((route) =>
      req.path === route || req.path.startsWith(route + "/")
    );

    /* ===================================================
       2) GLOBAL IP ACCESS CONTROL
    =================================================== */
    if (!isIpRuleRequest && clientIp !== "127.0.0.1") {
      const denied = await IpAccessService.isIpDenied(clientIp);
      if (denied) {
        return res.status(403).json({
          error: "Access blocked from your IP address",
          code: "IP_BLOCKED",
          ip: clientIp,
        });
      }
    }

    /* ===================================================
       3) ACCESS TOKEN EXTRACTION
    =================================================== */
    const token = extractAccessToken(req);
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    /* ===================================================
       4) VERIFY JWT
    =================================================== */
    const payload = TokenService.verifyAccessToken(token);
    if (!payload?.userId) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const { userId, impersonatorId = null } = payload;

    /* ===================================================
       5) SESSION ENFORCEMENT (PROD ONLY)
    =================================================== */
    let currentSession = null;

    if (process.env.NODE_ENV !== "test") {
      currentSession = await prisma.session.findUnique({
        where: { token },
        select: {
          id: true,
          expiresAt: true,
          userId: true,
        },
      });

      if (!currentSession) {
        return res.status(401).json({
          error: "Session not found or has been revoked",
          code: "SESSION_REVOKED",
        });
      }

      if (currentSession.userId !== userId) {
        return res.status(401).json({
          error: "Session mismatch",
          code: "SESSION_MISMATCH",
        });
      }

      if (new Date(currentSession.expiresAt) < new Date()) {
        await prisma.session.delete({ where: { token } }).catch(() => {});
        return res.status(401).json({
          error: "Session has expired",
          code: "SESSION_EXPIRED",
        });
      }

      // Update last activity (non-fatal)
      try {
        await prisma.session.update({
          where: { id: currentSession.id },
          data: { lastActivity: new Date() },
        });
      } catch {}
    }

    /* ===================================================
       6) LOAD USER + RELATIONS
    =================================================== */
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        clientProfile: true,
        adminProfile: true,
        resellerProfile: true,
        developerProfile: true,
      },
    });

    if (!user || user.disabled) {
      return res.status(404).json({
        error: "User not found or account disabled",
      });
    }

    /* ===================================================
       7) NORMALIZE ROLES
    =================================================== */
    const roles =
      user.roles?.map((r) => r.role?.name).filter(Boolean) || [];

    /* ===================================================
       8) NORMALIZE PERMISSIONS
    =================================================== */
    const permissionSet = new Set();
    user.roles.forEach((r) => {
      r.role.permissions.forEach((p) => {
        if (p.permission?.key) permissionSet.add(p.permission.key);
      });
    });
    const permissions = [...permissionSet];

    /* ===================================================
       9) PORTAL ACCESS RESOLUTION
    =================================================== */
    const portals = [];
    if (roles.some((r) => ["superadmin", "admin", "staff"].includes(r)))
      portals.push("admin");
    if (roles.includes("client")) portals.push("client");
    if (roles.includes("reseller")) portals.push("reseller");
    if (roles.includes("developer")) portals.push("developer");

    /* ===================================================
       10) MFA / TRUSTED DEVICE CHECK
    =================================================== */
    let mfaVerified = user.mfaEnabled === false;

    const trustedToken =
      req.cookies?.trusted_device ||
      req.cookies?.trusted_device_id ||
      null;

    if (trustedToken) {
      const trusted = await TrustedDeviceService.verifyTrustedDevice(
        user.id,
        trustedToken
      );
      if (trusted) mfaVerified = true;
    }

    /* ===================================================
       11) ATTACH AUTH CONTEXT
    =================================================== */
    req.user = {
      id: user.id,
      email: user.email,

      roles,
      permissions,
      portals,

      mfaEnabled: user.mfaEnabled,
      mfaVerified,

      // Profiles
      clientProfile: user.clientProfile || null,
      adminProfile: user.adminProfile || null,
      resellerProfile: user.resellerProfile || null,
      developerProfile: user.developerProfile || null,

      // Impersonation
      impersonatorId,
      isImpersonation: Boolean(impersonatorId),

      // Session context
      sessionId: currentSession?.id || null,
      ip: clientIp,
    };

    req.auth = {
      tokenPayload: payload,
      token,
    };

    return next();
  } catch (err) {
    console.error("authGuard error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

module.exports = authGuard;
