/**
 * Developer / Plugin Seller Portal Guard
 *
 * Allows:
 * - developer
 * - plugin seller
 */
module.exports = function developerPortalGuard(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasAccess = req.user.roles.includes("developer");

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied: developer portal only"
      });
    }

    if (req.user.developerProfile?.requireMfa && !req.user.mfaVerified) {
      return res.status(403).json({
        error: "MFA required"
      });
    }

    return next();
  } catch (err) {
    console.error("developerPortalGuard error:", err);
    return res.status(500).json({ error: "Developer portal check failed" });
  }
};
