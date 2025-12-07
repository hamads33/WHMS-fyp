// src/modules/auth/routes/adminUsers.routes.js
const { Router } = require("express");
const AdminUsersController = require("../controllers/adminUsers.controller");
const authGuard = require("../middlewares/auth.guard");
const rbacGuard = require("../middlewares/rbac.guard");

const router = Router();

// // All admin user management routes require auth + admin RBAC
// router.use(authGuard);
// router.use(rbacGuard(["admin", "superadmin", "staff"])); // restrict to these roles

// List users
router.get("/", AdminUsersController.list);

// Get single user
router.get("/:id", AdminUsersController.get);

// Update roles (replace)
router.post("/:id/roles", AdminUsersController.updateRoles);

// Deactivate user
router.post("/:id/deactivate", AdminUsersController.deactivate);

// Force logout (revoke sessions)
router.post("/:id/logout", AdminUsersController.forceLogout);

// Start impersonation as this user
router.post("/:id/impersonate", AdminUsersController.impersonate);

module.exports = router;
