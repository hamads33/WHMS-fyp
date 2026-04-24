/**
 * Reseller Portal Guard
 *
 * Allows:
 * - reseller
 * - reseller staff (if implemented later)
 */
module.exports = function resellerPortalGuard(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasAccess = req.user.roles.includes("reseller");

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied: reseller portal only"
      });
    }

    // Optional: reseller-specific MFA enforcement
    if (req.user.resellerProfile?.requireMfa && !req.user.mfaVerified) {
      return res.status(403).json({
        error: "MFA required"
      });
    }

    return next();
  } catch (err) {
    console.error("resellerPortalGuard error:", err);
    return res.status(500).json({ error: "Reseller portal check failed" });
  }
};
