/**
 * adminGuard(options?)
 *
 * Enforces:
 *  - Admin roles (superadmin, admin, staff)
 *  - Optional IP restriction
 *  - Optional allowed-hours access
 *  - Optional module restriction
 *  - Optional MFA enforcement
 *
 * Data sources:
 *  - req.user (from authGuard)
 *  - req.user.adminProfile.restrictionJson
 */

function adminGuard(options = {}) {
  const {
    requireMFA = true,      // enforce MFA by default
    allowedIPs = null,      // override IP whitelist
    allowedHours = null,    // override working hours
    requiredModule = null,  // restrict to a module
    debugBypass = false     // DEV ONLY
  } = options;

  return async function adminGuardMiddleware(req, res, next) {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      ////////////////////////////////////////////////////////////
      // DEBUG MODE (DEV ONLY)
      ////////////////////////////////////////////////////////////
      if (debugBypass === true) {
        console.warn("⚠️ adminGuard DEBUG MODE ENABLED");
        req.user.mfaVerified = true;
        return next();
      }

      ////////////////////////////////////////////////////////////
      // 1. ROLE CHECK
      ////////////////////////////////////////////////////////////
      const adminRoles = ["superadmin", "admin", "staff"];
      const hasAdminRole = (user.roles || []).some((r) =>
        adminRoles.includes(r)
      );

      if (!hasAdminRole) {
        return res.status(403).json({ error: "Admins only" });
      }

      ////////////////////////////////////////////////////////////
      // 2. LOAD ADMIN PROFILE RESTRICTIONS
      ////////////////////////////////////////////////////////////
      const adminProfile = user.adminProfile || {};
      const restrictions = adminProfile.restrictionJson || {};

      ////////////////////////////////////////////////////////////
      // 3. IP RESTRICTION
      ////////////////////////////////////////////////////////////
      const finalAllowedIPs = allowedIPs || restrictions.allowedIPs;

      if (Array.isArray(finalAllowedIPs) && finalAllowedIPs.length > 0) {
        const clientIP = req.user?.ip;


        if (!finalAllowedIPs.includes(clientIP)) {
          return res.status(403).json({
            error: "Access denied: IP not allowed",
            yourIP: clientIP,
            allowedIPs: finalAllowedIPs
          });
        }
      }

      ////////////////////////////////////////////////////////////
      // 4. ALLOWED HOURS
      ////////////////////////////////////////////////////////////
      const finalHours = allowedHours || restrictions.workingHours;

      if (finalHours?.start && finalHours?.end) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [sh, sm] = finalHours.start.split(":").map(Number);
        const [eh, em] = finalHours.end.split(":").map(Number);

        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        if (currentMinutes < startMin || currentMinutes > endMin) {
          return res.status(403).json({
            error: `Access allowed only between ${finalHours.start} and ${finalHours.end}`
          });
        }
      }

      ////////////////////////////////////////////////////////////
      // 5. MFA ENFORCEMENT
      ////////////////////////////////////////////////////////////
      const mfaRequired =
        restrictions.forceMFA === true || requireMFA === true;

      // Superadmin bypass
      if (user.roles.includes("superadmin")) {
        req.user.mfaVerified = true;
      }

      if (mfaRequired && !req.user.mfaVerified) {
        return res.status(403).json({
          error: "MFA required",
          mfaRequired: true
        });
      }

      ////////////////////////////////////////////////////////////
      // 6. MODULE RESTRICTION
      ////////////////////////////////////////////////////////////
      if (requiredModule) {
        const disabledModules = restrictions.disabledModules || [];

        if (
          Array.isArray(disabledModules) &&
          disabledModules.includes(requiredModule)
        ) {
          return res.status(403).json({
            error: `Access denied to module: ${requiredModule}`
          });
        }
      }

      ////////////////////////////////////////////////////////////
      // ALL CHECKS PASSED
      ////////////////////////////////////////////////////////////
      return next();

    } catch (err) {
      console.error("adminGuard error:", err);
      return res.status(500).json({ error: "Admin guard failed" });
    }
  };
}

/**
 * DEFAULT EXPORT (IMPORTANT)
 * Allows:
 *  - adminGuard
 *  - adminGuard({ options })
 */
module.exports = adminGuard;
