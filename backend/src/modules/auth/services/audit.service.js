const prisma = require("../../../../prisma/index");

const DEFAULT_SOURCE = "system";
const DEFAULT_ACTOR = "system";

const AuditService = {
  async log({
    userId,
    actor = DEFAULT_ACTOR,   // ✅ REQUIRED FIX
    action,
    entity,
    entityId,
    ip,
    userAgent,
    data,
    source = DEFAULT_SOURCE,
  }) {
    return prisma.auditLog.create({
      data: {
        source,
        action,
        actor,                // ✅ ALWAYS PRESENT
        userId: userId || null,
        entity: entity || null,
        entityId: entityId || null,
        ip: ip || null,
        userAgent: userAgent || null,
        data: data || null,
      },
    });
  },

  async safeLog(payload) {
    try {
      await this.log(payload);
    } catch (err) {
      console.error("Audit log error:", err.message);
    }
  },

  list(query = {}) {
    return prisma.auditLog.findMany({
      where: query,
      orderBy: { createdAt: "desc" },
    });
  },
};

module.exports = AuditService;
