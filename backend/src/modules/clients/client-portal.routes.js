// src/modules/clients/client-portal.routes.js
const { Router } = require("express");
const authGuard = require("../auth/middlewares/auth.guard");
const ctrl = require("./client-portal.controller");

const router = Router();

// GET /api/client/profile - Get current client's profile
router.get("/", authGuard, ctrl.getMyProfile);

// PUT /api/client/profile - Update current client's profile
router.put("/", authGuard, ctrl.updateMyProfile);

// POST /api/client/profile/change-password - Change password
router.post("/change-password", authGuard, ctrl.changePassword);

module.exports = router;
