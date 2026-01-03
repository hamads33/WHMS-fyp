/**
 * AuditService
 * ---------------------------------------------------------
 * Centralized audit logging + querying service.
 *
 * Used by:
 *  - Automation module
 *  - System actions
 *  - Workers / background jobs
 *
 * Guarantees:
 *  - Non-blocking writes
 *  - Structured metadata
 *  - Queryable logs (global + per profile)
 */

class AuditService {
  constructor({ prisma, logger }) {
    this.prisma = prisma;
    this.logger = logger;
  }

  // ======================================================
  // WRITE AUDIT LOG
  // ======================================================
  async write({
    source = "automation",
    action = "unknown",
    actor = "system",
    level = "INFO",
    meta = null,

    userId = null,
    entity = null,
    entityId = null,
    ip = null,
    userAgent = null,
    data = null,
    profileId = null
  }) {
    const payload = {
      source,
      action,
      actor,
      level,
      meta: profileId ? { ...meta, profileId } : meta,
      userId,
      entity,
      entityId,
      ip,
      userAgent,
      data
    };

    // DB write (fail-safe)
    try {
      if (this.prisma?.auditLog) {
        await this.prisma.auditLog.create({ data: payload });
      }
    } catch (err) {
      this.logger.error("Audit DB write failed", err);
    }

    // File / console log
    try {
      this.logger.info(
        "AUDIT [%s] %s by %s",
        source,
        action,
        actor
      );
    } catch (err) {
      console.error("AUDIT LOGGER FAILURE", err);
    }
  }

  // ======================================================
  // SHORTCUTS
  // ======================================================

  async automation(action, meta = {}, actor = "system", level = "INFO") {
    return this.write({
      source: "automation",
      action,
      actor,
      meta,
      level
    });
  }

  async system(action, { userId, entity, entityId, ip, userAgent, data } = {}) {
    return this.write({
      source: "system",
      action,
      actor: userId || "system",
      userId,
      entity,
      entityId,
      ip,
      userAgent,
      data,
      level: "INFO"
    });
  }

  // ======================================================
  // READ: LIST LOGS
  // ======================================================
  async list(filters = {}, limit = 50, offset = 0) {
    return this.prisma.auditLog.findMany({
      where: filters,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" }
    });
  }

  // ======================================================
  // READ: COUNT LOGS
  // ======================================================
  async count(filters = {}) {
    return this.prisma.auditLog.count({
      where: filters
    });
  }
}

module.exports = AuditService;