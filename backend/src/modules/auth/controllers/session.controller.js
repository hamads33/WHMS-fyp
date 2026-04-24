const prisma = require("../../../../prisma/index");
const TokenService = require("../services/token.service");

const SessionController = {
  /////////////////////////////////////////////////////////////////
  // GET /sessions  → List all active user sessions
  /////////////////////////////////////////////////////////////////
  async listSessions(req, res) {
  try {
    const userId = req.user.id;
    const currentToken = req.auth.token; // Current access token

    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ip: true,
        country: true,        // 🌍 geo-IP (optional)
        createdAt: true,
        expiresAt: true,
        lastActivity: true,
        token: true,          // used ONLY to detect current session
      },
    });

    const mapped = sessions.map((s) => ({
      id: s.id,

      // Device info (frontend parses userAgent safely)
      device: s.userAgent || "Unknown Device",
      userAgent: s.userAgent || null,

      // Network context
      ip: s.ip || null,
      country: s.country || "Unknown",

      // Timestamps
      startedAt: s.createdAt,
      lastActivity: s.lastActivity || s.createdAt,
      expiresAt: s.expiresAt,

      // Session state
      isCurrent: s.token === currentToken,
    }));

    return res.json({ sessions: mapped });
  } catch (err) {
    console.error("listSessions error:", err);
    return res.status(500).json({
      error: "Failed to load sessions",
    });
  }
}
,
  /////////////////////////////////////////////////////////////////
  // DELETE /sessions/:sessionId → Logout a specific session
  /////////////////////////////////////////////////////////////////
  async revokeSession(req, res) {
    try {
      const sessionId = req.params.sessionId;
      const userId = req.user.id;

      const session = await prisma.session.findUnique({ 
        where: { id: sessionId } 
      });

      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      await prisma.session.delete({ where: { id: sessionId } });

      res.json({ 
        success: true, 
        message: "Session revoked successfully" 
      });
    } catch (err) {
      console.error("revokeSession error", err);
      res.status(500).json({ error: "Failed to revoke session" });
    }
  },

  /////////////////////////////////////////////////////////////////
  // DELETE /sessions/others → Logout all other devices except current
  /////////////////////////////////////////////////////////////////
  async revokeOtherSessions(req, res) {
    try {
      const userId = req.user.id;
      const currentToken = req.auth.token; // ✅ Get current access token from auth guard

      if (!currentToken) {
        return res.status(400).json({ error: "Current session not found" });
      }

      // ✅ Delete all sessions except the current one
      const result = await prisma.session.deleteMany({
        where: {
          userId,
          token: { not: currentToken }, // Keep only current session
        },
      });

      res.json({
        success: true,
        message: "Other sessions revoked successfully",
        count: result.count, // Number of sessions revoked
      });
    } catch (err) {
      console.error("revokeOtherSessions error", err);
      res.status(500).json({ error: "Failed to revoke other sessions" });
    }
  },

  /////////////////////////////////////////////////////////////////
  // GET /security/logs → View login logs (success & failed)
  /////////////////////////////////////////////////////////////////
  async securityLogs(req, res) {
    try {
      const userId = req.user.id;

      const logs = await prisma.loginLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          success: true,
          ip: true,
          userAgent: true,
          reason: true,
          createdAt: true
        }
      });

      res.json({ logs });
    } catch (err) {
      console.error("securityLogs error", err);
      res.status(500).json({ error: "Failed to load security logs" });
    }
  },

  ///////////////////////////////////////////////////////////////
  // GET /session → Get current auth session context
  ///////////////////////////////////////////////////////////////
  async getCurrentSession(req, res) {
    try {
      const user = req.user;
      const roles = user.roles || [];

      // 🎯 PORTAL RESOLUTION (EXPLICIT & PRIORITIZED)
      let portal = "client"; // default

      if (roles.includes("superadmin") || roles.includes("admin") || roles.includes("staff")) {
        portal = "admin";
      } else if (roles.includes("developer")) {
        portal = "developer";
      }

      // Impersonation overrides everything
      if (req.impersonator) {
        portal = "client";
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions,
          portals: user.portals || [],
        },
        portal,
        portals: user.portals || [],
        impersonating: Boolean(req.impersonator),
        impersonator: req.impersonator || null,
      });
    } catch (err) {
      console.error("getCurrentSession error", err);
      res.status(500).json({ error: "Failed to load session" });
    }
  }
};

module.exports = SessionController;