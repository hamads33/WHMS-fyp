// src/modules/clients/clients.routes.js
// Mounted at /api/admin/clients — protected by authGuard + adminPortalGuard in app.js

const { Router } = require("express");
const { permissionGuard } = require("../auth/middlewares/permission.guard");
const ctrl = require("./clients.controller");

const router = Router();

router.get("/stats",                  permissionGuard("users.view"),           ctrl.stats);
router.get("/",                       permissionGuard("users.view"),           ctrl.list);
router.post("/",                      permissionGuard("users.roles.assign"),   ctrl.create);
router.get("/:id",                    permissionGuard("users.view"),           ctrl.get);
router.put("/:id/profile",            permissionGuard("users.roles.assign"),   ctrl.updateProfile);
router.post("/:id/activate",          permissionGuard("users.deactivate"),     ctrl.activate);
router.post("/:id/deactivate",        permissionGuard("users.deactivate"),     ctrl.deactivate);
router.post("/:id/logout",            permissionGuard("users.logout.force"),   ctrl.forceLogout);
router.post("/:id/reset-password",    permissionGuard("users.roles.assign"),   ctrl.resetPassword);
router.post("/:id/impersonate",       permissionGuard("users.impersonate"),    ctrl.impersonate);

module.exports = router;
