// src/modules/auth/controllers/impersonation.controller.js

const prisma = require("../../../../prisma/index");
const ImpersonationService = require("../services/impersonation.service");

/**
 * Impersonation Controller
 *
 * Handles admin impersonation of user accounts.
 *
 * Security:
 * - All routes MUST be protected by authGuard + adminPortalGuard
 * - Impersonation rules enforced via ImpersonationService
 * - All actions are audit logged
 */

const ImpersonationController = {
  /**
   * START IMPERSONATION
   * POST /api/auth/impersonate/start
   *
   * Body:
   * - targetUserId: string (required)
   * - reason: string (optional but recommended)
   *
   * Returns:
   * - accessToken: JWT with impersonation context
   * - refreshToken: JWT with impersonation context
   * - sessionId: Session identifier
   * - targetUser: Basic user info
   */
  async start(req, res) {
    try {
      const adminUser = req.user;

      // Validate authentication (should be handled by middleware, but double-check)
      if (!adminUser) {
        return res.status(401).json({ 
          error: "Not authenticated",
          message: "Admin authentication required to start impersonation"
        });
      }

      // Extract and validate request body
      const { targetUserId, reason } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ 
          error: "Missing required field",
          message: "targetUserId is required" 
        });
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
        return res.status(404).json({ 
          error: "Target user not found",
          message: `User with ID ${targetUserId} does not exist`
        });
      }

      // Check if target user is disabled/inactive
      if (targetUser.disabled) {
        return res.status(400).json({
          error: "Invalid target user",
          message: "Cannot impersonate a disabled user account"
        });
      }

      // Start impersonation (service handles permission checks and audit logging)
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
          roles: tgt.roles.map(r => r.role?.name).filter(Boolean)
        },
        message: `Now impersonating ${tgt.email}`
      });

    } catch (err) {
      console.error("❌ impersonation.start error:", err);

      // Handle specific error cases
      if (err.message.includes("not allowed to impersonate")) {
        return res.status(403).json({ 
          error: "Permission denied",
          message: err.message 
        });
      }

      return res.status(400).json({ 
        error: "Impersonation failed",
        message: err.message 
      });
    }
  },

  /**
   * STOP IMPERSONATION
   * POST /api/auth/impersonate/stop
   *
   * Body:
   * - sessionId: string (required)
   *
   * Returns:
   * - success: boolean
   */
  async stop(req, res) {
    try {
      const adminUser = req.user;

      // Validate authentication
      if (!adminUser) {
        return res.status(401).json({ 
          error: "Not authenticated",
          message: "Authentication required to stop impersonation"
        });
      }

      // Extract session ID
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          error: "Missing required field",
          message: "sessionId is required to stop impersonation"
        });
      }

      // Determine who is stopping the session
      // If currently impersonating, use the impersonatorId
      // Otherwise use the current user's ID
      const adminUserId = adminUser.impersonatorId || adminUser.id;

      // Stop impersonation (service handles validation and audit logging)
      await ImpersonationService.stopImpersonation({
        adminUserId,
        sessionId,
      });

      return res.json({ 
        success: true,
        message: "Impersonation session ended successfully"
      });

    } catch (err) {
      console.error("❌ impersonation.stop error:", err);

      // Handle specific error cases
      if (err.message.includes("Session not found")) {
        return res.status(404).json({ 
          error: "Session not found",
          message: err.message 
        });
      }

      if (err.message.includes("cannot stop")) {
        return res.status(403).json({ 
          error: "Permission denied",
          message: err.message 
        });
      }

      return res.status(400).json({ 
        error: "Failed to stop impersonation",
        message: err.message 
      });
    }
  },

  /**
   * LIST ACTIVE IMPERSONATION SESSIONS
   * GET /api/auth/impersonate/list
   *
   * Returns all active impersonation sessions started by the current admin.
   *
   * Returns:
   * - items: array of session objects
   */
  async list(req, res) {
    try {
      const adminUser = req.user;

      // Validate authentication
      if (!adminUser) {
        return res.status(401).json({ 
          error: "Not authenticated",
          message: "Authentication required to list impersonation sessions"
        });
      }

      // Get sessions for this admin
      const items = await ImpersonationService.listImpersonationsByAdmin(
        adminUser.id
      );

      // Enrich with user details
      const enriched = await Promise.all(
        items.map(async (session) => {
          const targetUser = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
              id: true,
              email: true,
              disabled: true
            }
          });

          return {
            sessionId: session.id,
            targetUser: targetUser ? {
              id: targetUser.id,
              email: targetUser.email,
              disabled: targetUser.disabled
            } : null,
            reason: session.impersonationReason,
            startedAt: session.createdAt,
            expiresAt: session.expiresAt,
            ip: session.ip,
            userAgent: session.userAgent
          };
        })
      );

      return res.json({ 
        success: true,
        items: enriched,
        total: enriched.length
      });

    } catch (err) {
      console.error("❌ impersonation.list error:", err);
      return res.status(400).json({ 
        error: "Failed to list impersonation sessions",
        message: err.message 
      });
    }
  },

  /**
   * GET CURRENT IMPERSONATION STATUS
   * GET /api/auth/impersonate/status
   *
   * Returns information about the current impersonation state.
   *
   * Returns:
   * - isImpersonating: boolean
   * - impersonator: admin user info (if impersonating)
   * - currentUser: current user info
   */
  async status(req, res) {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ 
          error: "Not authenticated" 
        });
      }

      const isImpersonating = Boolean(user.impersonatorId);

      let impersonator = null;
      if (isImpersonating) {
        impersonator = await prisma.user.findUnique({
          where: { id: user.impersonatorId },
          select: {
            id: true,
            email: true,
            roles: {
              include: { role: true }
            }
          }
        });
      }

      return res.json({
        success: true,
        isImpersonating,
        currentUser: {
          id: user.id,
          email: user.email,
          roles: user.roles
        },
        impersonator: impersonator ? {
          id: impersonator.id,
          email: impersonator.email,
          roles: impersonator.roles.map(r => r.role?.name).filter(Boolean)
        } : null
      });

    } catch (err) {
      console.error("❌ impersonation.status error:", err);
      return res.status(500).json({ 
        error: "Failed to get impersonation status",
        message: err.message 
      });
    }
  }
};

module.exports = ImpersonationController;