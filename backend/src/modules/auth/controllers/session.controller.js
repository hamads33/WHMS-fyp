const prisma = require("../../../../prisma/index");
const TokenService = require("../services/token.service");

const SessionController = {
  /////////////////////////////////////////////////////////////////
  // GET /sessions  → List all active user sessions
  /////////////////////////////////////////////////////////////////
  async listSessions(req, res) {
    try {
      const userId = req.user.id;

      const sessions = await prisma.session.findMany({
        where: { userId },
        select: {
          id: true,
          token: true,
          userAgent: true,
          ip: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: { createdAt: "desc" }
      });

      res.json({ sessions });
    } catch (err) {
      console.error("listSessions error", err);
      res.status(500).json({ error: "Failed to load sessions" });
    }
  },

  /////////////////////////////////////////////////////////////////
  // DELETE /sessions/:sessionId → Logout a specific session
  /////////////////////////////////////////////////////////////////
  async revokeSession(req, res) {
    try {
      const sessionId = req.params.sessionId;
      const userId = req.user.id;

      const session = await prisma.session.findUnique({ where: { id: sessionId } });

      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      await prisma.session.delete({ where: { id: sessionId } });

      res.json({ success: true, message: "Session revoked" });
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

      const authHeader = req.headers.authorization || "";
      const currentToken = authHeader.replace("Bearer ", "").trim();

      if (!currentToken) {
        return res.status(400).json({ error: "Missing current token" });
      }

      await prisma.session.deleteMany({
        where: {
          userId,
          token: { not: currentToken }
        }
      });

      res.json({ success: true, message: "Other sessions revoked" });
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
  }
};

module.exports = SessionController;
