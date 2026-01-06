// src/modules/auth/routes/adminUsers.routes.js
// Complete admin user management routes

const { Router } = require("express");
const AdminUsersController = require("../controllers/adminUsers.controller");
const authGuard = require("../middlewares/auth.guard");
const adminPortalGuard = require("../guards/adminPortal.guard");

const router = Router();

/**
 * 👨‍💼 ADMIN USER MANAGEMENT ROUTES
 * All routes require: authentication + admin portal access
 */

router.use(authGuard);
router.use(adminPortalGuard);

/**
 * GET /api/auth/admin/users/stats
 * Get user statistics (total, active, disabled, by role)
 * MUST come before /:id routes
 */
router.get(
  "/stats",
  AdminUsersController.getStats
);

/**
 * GET /api/auth/admin/users/roles
 * Get all roles with permissions
 * MUST come before /:id routes
 */
router.get(
  "/roles",
  AdminUsersController.listRoles
);

/**
 * GET /api/auth/admin/users
 * List users with pagination, search, and filters
 * Query: q (search), page, limit, role, status
 */
router.get(
  "/",
  AdminUsersController.list
);

/**
 * GET /api/auth/admin/users/:id
 * Get full user details by ID
 */
router.get(
  "/:id",
  AdminUsersController.get
);

/**
 * POST /api/auth/admin/users/:id/roles
 * Update user roles (replace existing roles)
 */
router.post(
  "/:id/roles",
  AdminUsersController.updateRoles
);

/**
 * POST /api/auth/admin/users/:id/activate
 * Re-enable disabled user account
 */
router.post(
  "/:id/activate",
  AdminUsersController.activate
);

/**
 * POST /api/auth/admin/users/:id/deactivate
 * Disable user account
 */
router.post(
  "/:id/deactivate",
  AdminUsersController.deactivate
);

/**
 * POST /api/auth/admin/users/:id/logout
 * Force logout user (revoke all sessions)
 */
router.post(
  "/:id/logout",
  AdminUsersController.forceLogout
);

/**
 * POST /api/auth/admin/users/:id/impersonate
 * Start impersonation of target user
 */
router.post(
  "/:id/impersonate",
  AdminUsersController.impersonate
);

module.exports = router;