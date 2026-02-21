// src/modules/auth/routes/rbacAdmin.routes.js
// authGuard + adminPortalGuard applied at mount point in app.js
//
// GETs  — any admin portal user (no specific permission needed)
// Writes — superadmin role required
// bootstrap — any admin (first-time setup)

const { Router } = require("express");
const RbacAdminController = require("../controllers/rbacAdmin.controller");
const rbacGuard = require("../middlewares/rbac.guard");

const router = Router();

// POST /api/admin/rbac/bootstrap
// Creates/syncs all system permission records in DB.
// Must be accessible even when permissions don't exist yet.
router.post("/bootstrap", RbacAdminController.bootstrap);

// GET /api/admin/rbac/roles — list roles + current permission assignments
router.get("/roles", RbacAdminController.listRoles);

// GET /api/admin/rbac/permissions — list all system permissions grouped by module
router.get("/permissions", RbacAdminController.listPermissions);

// PUT  /api/admin/rbac/roles/:roleId/permissions — replace full permission set (superadmin only)
router.put(
  "/roles/:roleId/permissions",
  rbacGuard(["superadmin"]),
  RbacAdminController.setRolePermissions
);

// POST   /api/admin/rbac/roles/:roleId/permissions/:permissionKey — add one (superadmin only)
router.post(
  "/roles/:roleId/permissions/:permissionKey",
  rbacGuard(["superadmin"]),
  RbacAdminController.addPermissionToRole
);

// DELETE /api/admin/rbac/roles/:roleId/permissions/:permissionKey — remove one (superadmin only)
router.delete(
  "/roles/:roleId/permissions/:permissionKey",
  rbacGuard(["superadmin"]),
  RbacAdminController.removePermissionFromRole
);

module.exports = router;
