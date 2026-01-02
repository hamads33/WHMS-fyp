/**
 * Admin Portal Guard
 *
 * Enforces access control for admin portal routes.
 *
 * Requirements:
 * - User must have admin role (superadmin, admin, or staff)
 * - MFA must be verified (unless explicitly disabled via env var)
 * - User must be authenticated
 *
 * Usage:
 *   router.use("/admin", authGuard, adminPortalGuard, adminRoutes);
 */

/**
 * Check if MFA should be enforced based on environment
 * In development, MFA can be disabled via DISABLE_MFA_IN_DEV=true
 * In production, MFA is ALWAYS enforced for admin portal
 */
function shouldEnforceMFA() {
  const isProduction = process.env.NODE_ENV === "production";
  const devBypass = process.env.DISABLE_MFA_IN_DEV === "true";

  // Production: always enforce MFA
  if (isProduction) {
    return true;
  }

  // Development: enforce unless explicitly disabled
  return !devBypass;
}

/**
 * Admin Portal Guard Middleware
 */
function adminPortalGuard(req, res, next) {
  try {
    // 1. Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Authentication required" 
      });
    }

    // 2. Check for admin roles
    const allowedRoles = ["superadmin", "admin", "staff"];
    const userRoles = req.user.roles || [];

    const hasAdminRole = userRoles.some((role) => 
      allowedRoles.includes(role)
    );

    if (!hasAdminRole) {
      return res.status(403).json({
        error: "Access denied",
        message: "Admin portal access requires admin, staff, or superadmin role",
        requiredRoles: allowedRoles,
        userRoles: userRoles
      });
    }

    // 3. MFA Enforcement
    const enforceMFA = shouldEnforceMFA();

    if (enforceMFA) {
      // Superadmin bypass: optionally skip MFA for superadmin
      const isSuperadmin = userRoles.includes("superadmin");
      const superadminBypassMFA = process.env.SUPERADMIN_BYPASS_MFA === "true";

      if (isSuperadmin && superadminBypassMFA) {
        // Allow superadmin to bypass MFA if configured
        console.warn(
          `⚠️  Superadmin ${req.user.email} bypassing MFA (SUPERADMIN_BYPASS_MFA=true)`
        );
      } else if (!req.user.mfaVerified) {
        // MFA required but not verified
        return res.status(403).json({
          error: "MFA required",
          message: "Multi-factor authentication must be verified to access admin portal",
          mfaRequired: true
        });
      }
    } else {
      // Development mode with MFA disabled
      console.warn(
        `⚠️  MFA enforcement disabled (NODE_ENV=${process.env.NODE_ENV}, DISABLE_MFA_IN_DEV=true)`
      );
    }

    // 4. All checks passed
    return next();

  } catch (err) {
    console.error("adminPortalGuard error:", err);
    return res.status(500).json({ 
      error: "Internal server error",
      message: "Admin portal access verification failed" 
    });
  }
}

module.exports = adminPortalGuard;