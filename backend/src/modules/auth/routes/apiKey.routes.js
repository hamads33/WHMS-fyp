// src/modules/auth/routes/apiKey.routes.js
// Complete API key management routes

const { Router } = require("express");
const authGuard = require("../middlewares/auth.guard");
const ApiKeyController = require("../controllers/apiKey.controller");

const router = Router();

/**
 * 🔑 API KEY MANAGEMENT ROUTES
 * All routes require authentication
 */

/**
 * POST /api/auth/api-keys
 * Create new API key
 */
router.post(
  "/",
  authGuard,
  ApiKeyController.create
);

/**
 * GET /api/auth/api-keys
 * List all API keys for user
 */
router.get(
  "/",
  authGuard,
  ApiKeyController.list
);

/**
 * DELETE /api/auth/api-keys/:keyId
 * Revoke API key
 */
router.delete(
  "/:keyId",
  authGuard,
  ApiKeyController.revoke
);

module.exports = router;