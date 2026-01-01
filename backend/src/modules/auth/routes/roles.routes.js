// src/modules/auth/routes/roles.routes.js
const { Router } = require("express");
const AdminUsersController = require("../controllers/adminUsers.controller");
const authGuard = require("../middlewares/auth.guard");

const router = Router();

// ✅ GET /api/admin/roles - List all roles with permissions
router.get("/", authGuard, AdminUsersController.listRoles);

module.exports = router;