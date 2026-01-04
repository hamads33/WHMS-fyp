// ============================================================================
// Audit Logging Service
// ============================================================================

const prisma = require("../../prisma");

class AuditLoggerService {
  async log({
    actor,
    action,
    resource,
    resourceId = null,
    details = {},
    ipAddress = null,
    userAgent = null,
    source = "system",
  }) {
    try {
      return await prisma.auditLog.create({
        data: {
          // 🔒 HARD-CODED ACTOR
          actor: "SUPERADMIN",

          action,
          resource,
          resourceId: resourceId !== null ? String(resourceId) : null,
          details,
          ipAddress,
          userAgent,
          source,
          timestamp: new Date(),
        },
      });
    } catch (err) {
      // Must never break business flow
      console.error("Audit logging failed:", err);
      return null;
    }
  }
}

const auditLogger = new AuditLoggerService();

module.exports = {
  auditLogger,
};
