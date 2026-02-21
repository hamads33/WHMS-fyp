/**
 * Superadmin-Only Guard
 *
 * Restricts a route to users with the `superadmin` role exclusively.
 * Must be used AFTER authGuard.
 *
 * Usage:
 *   router.post("/admin/plugins/:id/approve", authGuard, superadminOnlyGuard, ctrl.approvePlugin)
 */

function superadminOnlyGuard(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
    }

    const roles = req.user.roles || [];

    if (!roles.includes("superadmin")) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only superadmin can perform this action",
        requiredRole: "superadmin",
      });
    }

    return next();
  } catch (err) {
    console.error("superadminOnlyGuard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = superadminOnlyGuard;
