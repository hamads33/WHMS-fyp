// src/modules/auth/routes/adminUsers.routes.js
// authGuard + adminPortalGuard are applied at mount point in app.js

const { Router } = require("express");
const AdminUsersController = require("../controllers/adminUsers.controller");
const { permissionGuard } = require("../middlewares/permission.guard");

const router = Router();

// GET /api/admin/users/stats
router.get("/stats",     permissionGuard("users.view"),          AdminUsersController.getStats);

// GET /api/admin/users/roles — accessible to anyone with admin portal access
router.get("/roles", AdminUsersController.listRoles);

// GET /api/admin/users
router.get("/",          permissionGuard("users.view"),          AdminUsersController.list);

// GET /api/admin/users/:id
router.get("/:id",       permissionGuard("users.view"),          AdminUsersController.get);

// POST /api/admin/users/:id/roles
router.post("/:id/roles",      permissionGuard("users.roles.assign"),  AdminUsersController.updateRoles);

// POST /api/admin/users/:id/activate  |  /deactivate
router.post("/:id/activate",   permissionGuard("users.deactivate"),    AdminUsersController.activate);
router.post("/:id/deactivate", permissionGuard("users.deactivate"),    AdminUsersController.deactivate);

// POST /api/admin/users/:id/logout
router.post("/:id/logout",     permissionGuard("users.logout.force"),  AdminUsersController.forceLogout);

// POST /api/admin/users/:id/impersonate
router.post("/:id/impersonate", permissionGuard("users.impersonate"),  AdminUsersController.impersonate);

module.exports = router;
