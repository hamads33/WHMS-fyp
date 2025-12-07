/**
 * permissionGuard(permissionKey)
 * 
 * Example:
 * router.get("/admin", authGuard, permissionGuard("admin.access"), handler)
 */

function permissionGuard(requiredPermission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userPermissions = req.user.permissions || [];

      // Check permission
      if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          error: "Forbidden — missing permission: " + requiredPermission
        });
      }

      return next();
    } catch (err) {
      console.error("permissionGuard error", err);
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
}

module.exports = { permissionGuard };

