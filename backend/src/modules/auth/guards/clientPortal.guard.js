/**
 * Client Portal Guard
 *
 * Allows:
 * - client
 */
module.exports = function clientPortalGuard(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasAccess = req.user.roles.includes("client");

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied: client portal only"
      });
    }

    // Optional: enforce MFA if client enabled it
    if (req.user.clientProfile?.requireMfa && !req.user.mfaVerified) {
      return res.status(403).json({
        error: "MFA required"
      });
    }

    return next();
  } catch (err) {
    console.error("clientPortalGuard error:", err);
    return res.status(500).json({ error: "Client portal check failed" });
  }
};
