// src/modules/auth/middlewares/rbac.guard.js
/**
 * RBAC guard factory middleware.
 * Usage: app.use(rbacGuard(['admin','superadmin']))
 *
 * It expects req.user to be set by authGuard and that req.user.roles is an array of role names.
 */
module.exports = function allowedRoles(required = []) {
  if (!Array.isArray(required)) required = [required];

  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const roles = (user.roles || []).map(r => (typeof r === "string" ? r : r.name || r.role || r)).filter(Boolean);

      const ok = required.some(r => roles.includes(r));
      if (!ok) return res.status(403).json({ error: "Forbidden" });

      return next();
    } catch (err) {
      console.error("RBAC GUARD ERROR:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  };
};

