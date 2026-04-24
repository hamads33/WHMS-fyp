// src/modules/auth/routes/roles.routes.js
// authGuard + adminPortalGuard applied at mount point in app.js

const { Router } = require("express");
const AdminUsersController = require("../controllers/adminUsers.controller");
const { permissionGuard } = require("../middlewares/permission.guard");

const router = Router();

// GET /api/admin/roles — list all roles with their permissions
router.get("/", permissionGuard("roles.view"), AdminUsersController.listRoles);

module.exports = router;
