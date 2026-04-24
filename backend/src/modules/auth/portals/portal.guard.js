/**
 * Portal Guard Generator
 * 
 * Ensures user has specific roles before accessing a portal.
 */

function portalGuard(requiredRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userRoles = req.user.roles || [];
    const hasAccess = userRoles.some(r => requiredRoles.includes(r));

    if (!hasAccess) {
      return res.status(403).json({
        error: "You do not have permission to access this portal",
        requiredRoles
      });
    }

    return next();
  };
}

module.exports = { portalGuard };
