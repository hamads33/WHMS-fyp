class AuditService {
  /**
   * prisma: PrismaClient
   * logger: injected logger (pino)
   */
  constructor({ prisma, logger }) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * General-purpose Audit Logger (supports both automation + system format)
   *
   * @param {Object} opts
   * @param {String} opts.source      - "automation", "billing", "system", etc
   * @param {String} opts.action      - type of action (e.g., "task.failed")
   * @param {String|null} opts.actor  - user id, "system", "worker", etc.
   * @param {Json} opts.meta          - structured data for automation
   * @param {String} opts.level       - INFO | WARN | ERROR
   *
   * Optional system fields:
   * @param {String|null} opts.userId - when logging on behalf of a real user
   * @param {String|null} opts.entity - entity type (e.g., "Order", "Invoice")
   * @param {String|null} opts.entityId
   * @param {String|null} opts.ip
   * @param {String|null} opts.userAgent
   * @param {Json|null} opts.data     - extended metadata
   */
  async write({
    source = "automation",
    action = "unknown",
    actor = "system",
    meta = null,
    level = "INFO",

    userId = null,
    entity = null,
    entityId = null,
    ip = null,
    userAgent = null,
    data = null
  }) {
    const payload = {
      source,
      action,
      actor,
      level,
      meta,

      userId,
      entity,
      entityId,
      ip,
      userAgent,
      data
    };

    // DB write (non-blocking)
    try {
      if (this.prisma?.auditLog) {
        await this.prisma.auditLog.create({ data: payload });
      }
    } catch (err) {
      this.logger.error("Audit DB write failed: %s", err.stack || err);
    }

    // Log to console / file
    try {
      this.logger.info("AUDIT [%s] %s by %s %o", source, action, actor, payload);
    } catch (err) {
      console.error("AUDIT LOGGING FAILURE", err);
    }
  }

  /**
   * Shortcut for automation logs
   */
  async automation(action, meta = {}, actor = "system", level = "INFO") {
    return this.write({
      source: "automation",
      action,
      actor,
      meta,
      level
    });
  }

  /**
   * Shortcut for system audit logs (user actions)
   */
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
}

module.exports = AuditService;
