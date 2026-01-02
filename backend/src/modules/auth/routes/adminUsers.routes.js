// src/modules/auth/routes/adminUsers.routes.js
const { Router } = require("express");
const AdminUsersController = require("../controllers/adminUsers.controller");
const authGuard = require("../middlewares/auth.guard");
const rbacGuard = require("../middlewares/rbac.guard");

const router = Router();

// Apply auth to all routes
router.use(authGuard);

// Optional: Uncomment to restrict to admin roles only
// router.use(rbacGuard(["admin", "superadmin", "staff"]));

// ✅ NEW: Get user statistics (MUST come before /:id route)
router.get("/stats", AdminUsersController.getStats);

// ✅ NEW: Get all roles (MUST come before /:id route)
router.get("/roles", AdminUsersController.listRoles);

// List users
router.get("/", AdminUsersController.list);

// Get single user
router.get("/:id", AdminUsersController.get);

// Update roles (replace)
router.post("/:id/roles", AdminUsersController.updateRoles);

// ✅ NEW: Activate user
router.post("/:id/activate", AdminUsersController.activate);

// Deactivate user
router.post("/:id/deactivate", AdminUsersController.deactivate);

// Force logout (revoke sessions)
router.post("/:id/logout", AdminUsersController.forceLogout);

// Start impersonation as this user
router.post("/:id/impersonate", AdminUsersController.impersonate);

module.exports = router;