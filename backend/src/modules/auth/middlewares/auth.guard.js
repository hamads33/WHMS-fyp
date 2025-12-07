// src/modules/auth/middlewares/auth.guard.js

const TokenService = require("../services/token.service");
const TrustedDeviceService = require("../services/trustedDevice.service");
const prisma = require("../../../../prisma/index");

/**
 * Authentication Guard
 * - Reads correct cookie names: access_token, refresh_token
 * - Supports Authorization: Bearer token fallback
 * - Loads user, roles, permissions, profiles
 * - Handles impersonation + trusted devices
 */
async function authGuard(req, res, next) {
  try {
    // -----------------------------------------------------
    // 1) Extract Access Token (COOKIE FIRST, NOT HEADER)
    // -----------------------------------------------------
    const cookieToken =
      req.cookies?.access_token ||   // ✔ correct cookie name set by AuthController
      req.cookies?.accessToken ||    // legacy fallback
      req.cookies?.token ||          // fallback
      null;

    const header = req.headers.authorization || "";
    const headerToken = header.startsWith("Bearer ")
      ? header.replace("Bearer ", "").trim()
      : null;

    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated (no token)" });
    }

    // -----------------------------------------------------
    // 2) Verify JWT
    // -----------------------------------------------------
    const payload = TokenService.verifyAccessToken(token);

    if (!payload || !payload.userId) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = payload.userId;
    const impersonatorId = payload.impersonatorId || null;

    // -----------------------------------------------------
    // 3) Load user + roles + permissions + profiles
    // -----------------------------------------------------
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

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // -----------------------------------------------------
    // 4) Normalize roles
    // -----------------------------------------------------
    const roles =
      user.roles?.map((r) => r.role?.name).filter(Boolean) || [];

    // -----------------------------------------------------
    // 5) Normalize permissions
    // -----------------------------------------------------
    const permissionSet = new Set();
    user.roles?.forEach((r) =>
      r.role?.permissions?.forEach((p) => {
        if (p.permission?.key) permissionSet.add(p.permission.key);
      })
    );
    const permissions = [...permissionSet];

    // -----------------------------------------------------
    // 6) Determine portals
    // -----------------------------------------------------
    const portals = [];
    if (roles.some((r) => ["superadmin", "admin", "staff"].includes(r)))
      portals.push("admin");
    if (roles.includes("client")) portals.push("client");
    if (roles.includes("reseller")) portals.push("reseller");
    if (roles.includes("developer")) portals.push("developer");

    // -----------------------------------------------------
    // 7) Trusted device / MFA
    // -----------------------------------------------------
    let mfaVerified = user.mfaVerified || false;

    const trustedToken = req.cookies?.trusted_device;
    if (trustedToken) {
      const trusted = await TrustedDeviceService.verifyTrustedDevice(
        user.id,
        trustedToken
      );
      if (trusted) mfaVerified = true;
    }

    // -----------------------------------------------------
    // 8) Attach req.user
    // -----------------------------------------------------
    req.user = {
      id: user.id,
      email: user.email,
      roles,
      permissions,
      portals,
      mfaVerified,
      impersonatorId,
      isImpersonation: !!impersonatorId,

      clientProfile: user.clientProfile || null,
      adminProfile: user.adminProfile || null,
      resellerProfile: user.resellerProfile || null,
      developerProfile: user.developerProfile || null,
    };

    req.auth = { tokenPayload: payload };

    return next();
  } catch (err) {
    console.error("authGuard error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

module.exports = authGuard;
