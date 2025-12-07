const AuditService = require("../services/audit.service");
const prisma = require("../../../../prisma/index");

/**
 * GET /api/admin/impersonation/logs
 * Query: page, limit, adminId, targetUserId, sessionId
 */
const ImpersonationLogsController = {
  async list(req, res) {
    try {
      const page = parseInt(req.query.page || "1", 10);
      const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
      const skip = (page - 1) * limit;

      const { adminId, targetUserId, sessionId } = req.query;

      const where = {
        action: { in: ["impersonation.start", "impersonation.stop"] }
      };

      if (adminId) where.userId = adminId;
      if (sessionId) where.entityId = sessionId;
      if (targetUserId) where.data = { path: ["targetUserId"], equals: targetUserId };

      // Prisma doesn't support JSON path equals in a portable way across providers in findMany filters.
      // We'll use raw SQL for the targetUserId filter if provided (Postgres example).
      let items = [];
      let total = 0;

      if (targetUserId) {
        // Postgres JSONB containment query
        const rows = await prisma.$queryRawUnsafe(
          `SELECT * FROM "AuditLog" WHERE action = ANY($1) AND data->>'targetUserId' = $2 ORDER BY "createdAt" DESC LIMIT $3 OFFSET $4`,
          ["impersonation.start", "impersonation.stop"],
          targetUserId,
          limit,
          skip
        );
        items = rows;
        const countRes = await prisma.$queryRawUnsafe(
          `SELECT count(1) as cnt FROM "AuditLog" WHERE action = ANY($1) AND data->>'targetUserId' = $2`,
          ["impersonation.start", "impersonation.stop"],
          targetUserId
        );
        total = parseInt(countRes[0]?.cnt || 0, 10);
      } else {
        // simple findMany
        items = await prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit
        });
        total = await prisma.auditLog.count({ where });
      }

      // map user email if available
      const userIds = Array.from(new Set(items.map(i => i.userId).filter(Boolean)));
      const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds }}}) : [];
      const usersMap = Object.fromEntries(users.map(u => [u.id, u.email]));

      const out = items.map(i => ({
        id: i.id,
        userId: i.userId,
        userEmail: usersMap[i.userId] || null,
        action: i.action,
        entity: i.entity,
        entityId: i.entityId,
        ip: i.ip,
        userAgent: i.userAgent,
        data: i.data,
        createdAt: i.createdAt
      }));

      return res.json({ items: out, total, page, limit });
    } catch (err) {
      console.error("impersonationLogs.list error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
};

module.exports = ImpersonationLogsController;
