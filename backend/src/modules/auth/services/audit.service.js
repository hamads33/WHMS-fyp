const prisma = require("../../../../prisma/index");

const AuditService = {
  // Main log function
  async log({ userId, action, entity, entityId, ip, userAgent, data }) {
    return prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity: entity || null,
        entityId: entityId || null,
        ip: ip || null,
        userAgent: userAgent || null,
        data: data || null
      }
    });
  },

  // Fail-safe wrapper — avoids crashes
  async safeLog(payload) {
    try {
      await this.log(payload);
    } catch (err) {
      console.error("Audit log error:", err);
      // never throw
    }
  },

  // For admin panels
  list(query = {}) {
    return prisma.auditLog.findMany({
      where: query,
      orderBy: { createdAt: "desc" }
    });
  }
};

module.exports = AuditService;
