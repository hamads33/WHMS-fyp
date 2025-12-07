// src/modules/auth/controllers/impersonation.controller.js

const prisma = require("../../../../prisma/index");
const ImpersonationService = require("../services/impersonation.service");

// ------------------------------------------------------------
// DEV MODE SWITCH — TURN OFF IN PRODUCTION
// ------------------------------------------------------------
const DEV_MODE = true;

/**
 * Ensures req.user exists during development.
 * Prevents authGuard, MFA, permissions, and middleware crashes.
 */
function applyDevUser(req) {
  if (!DEV_MODE) return;

  req.user = {
    id: "DEV-ADMIN-ID",
    email: "dev-admin@example.com",
    roles: ["admin"],
    permissions: [
      "impersonation.start",
      "impersonation.stop",
      "impersonation.list",
    ],
    mfaVerified: true,
  };
}

// ------------------------------------------------------------
// CONTROLLER
// ------------------------------------------------------------
const ImpersonationController = {
  // ============================================================
  // START IMPERSONATION
  // POST /api/auth/impersonate/start
  // ============================================================
  async start(req, res) {
    try {
      // Always apply DEV mock user for development
      applyDevUser(req);

      const adminUser = req.user;

      if (!adminUser)
        return res.status(401).json({ error: "Not authenticated" });

      const { targetUserId, reason } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ error: "targetUserId is required" });
      }

      // Validate target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });

      if (!targetUser) {
        return res.status(404).json({ error: "Target user not found" });
      }

      // Start impersonation session
      const result = await ImpersonationService.startImpersonation({
        adminUser,
        targetUserId,
        reason,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      const { accessToken, refreshToken, session, targetUser: tgt } = result;

      return res.json({
        success: true,
        accessToken,
        refreshToken,
        sessionId: session.id,
        targetUser: {
          id: tgt.id,
          email: tgt.email,
        },
      });
    } catch (err) {
      console.error("❌ impersonation.start error:", err);
      return res.status(400).json({ error: err.message });
    }
  },

  // ============================================================
  // STOP IMPERSONATION
  // POST /api/auth/impersonate/stop
  // ============================================================
  async stop(req, res) {
    try {
      applyDevUser(req);

      const adminUser = req.user;

      if (!adminUser)
        return res.status(401).json({ error: "Not authenticated" });

      const { sessionId } = req.body;

      if (!sessionId) {
        return res
          .status(400)
          .json({ error: "sessionId is required to stop impersonation" });
      }

      await ImpersonationService.stopImpersonation({
        adminUserId: adminUser.id,
        sessionId,
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("❌ impersonation.stop error:", err);
      return res.status(400).json({ error: err.message });
    }
  },

  // ============================================================
  // LIST ACTIVE IMPERSONATION SESSIONS BY ADMIN
  // GET /api/auth/impersonate/list
  // ============================================================
  async list(req, res) {
    try {
      applyDevUser(req);

      const adminUser = req.user;

      if (!adminUser)
        return res.status(401).json({ error: "Not authenticated" });

      const items =
        await ImpersonationService.listImpersonationsByAdmin(adminUser.id);

      return res.json({ items });
    } catch (err) {
      console.error("❌ impersonation.list error:", err);
      return res.status(400).json({ error: err.message });
    }
  },
};

module.exports = ImpersonationController;
