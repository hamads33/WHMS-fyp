
class AuditLoggerService {
  constructor({ prisma, logger }) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Log an audit event (generic method)
   */
  async log({
    source,
    action,
    actor = "system",
    level = "INFO",
    userId = null,
    entity = null,
    entityId = null,
    ip = null,
    userAgent = null,
    meta = null,
    data = null,
    profileId = null,
  }) {
    try {
      const logEntry = await this.prisma.auditLog.create({
        data: {
          source,
          action,
          actor,
          level,
          userId,
          entity,
          entityId: entityId ? String(entityId) : null,
          ip,
          userAgent,
          meta: meta || null,
          data: data || null,
          profileId: profileId || null,
        },
      });

      // Console log for debugging
      this.logger.info(`[AUDIT] ${source}.${action} by ${actor}`, {
        entityId,
        userId,
        level,
      });

      return logEntry;
    } catch (err) {
      this.logger.error("Failed to create audit log:", err);
      // Don't throw - audit logging should not break application
      return null;
    }
  }

  /**
   * Log user action (convenience method)
   */
  async logUserAction({
    action,
    userId,
    entity,
    entityId,
    ip,
    userAgent,
    meta = null,
    data = null,
  }) {
    return this.log({
      source: "user",
      action,
      actor: userId || "system",
      level: "INFO",
      userId,
      entity,
      entityId,
      ip,
      userAgent,
      meta,
      data,
    });
  }

  /**
   * Log auth action (convenience method)
   */
  async logAuthAction({
    action,
    userId,
    ip,
    userAgent,
    success = true,
    meta = null,
  }) {
    return this.log({
      source: "auth",
      action,
      actor: userId || "anonymous",
      level: "INFO",
      userId,
      ip,
      userAgent,
      entity: "User",
      entityId: userId,
      meta: {
        success,
        ...meta,
      },
    });
  }

  /**
   * Log order action (convenience method)
   */
  async logOrderAction({
    action,
    orderId,
    userId,
    ip,
    meta = null,
    data = null,
  }) {
    return this.log({
      source: "order",
      action,
      actor: userId || "system",
      level: "INFO",
      userId,
      entity: "Order",
      entityId: orderId,
      ip,
      meta,
      data,
    });
  }

  /**
   * Log domain action (convenience method)
   */
  async logDomainAction({
    action,
    domainId,
    domainName,
    userId,
    ip,
    meta = null,
    data = null,
  }) {
    return this.log({
      source: "domain",
      action,
      actor: userId || "system",
      level: "INFO",
      userId,
      entity: "Domain",
      entityId: domainId,
      ip,
      meta: {
        domainName,
        ...meta,
      },
      data,
    });
  }

  /**
   * Log error event
   */
  async logError({
    source,
    action,
    error,
    userId = null,
    entity = null,
    entityId = null,
    context = null,
  }) {
    return this.log({
      source,
      action,
      actor: "system",
      level: "ERROR",
      userId,
      entity,
      entityId,
      meta: {
        error: error.message,
        errorCode: error.code,
        errorStack: error.stack,
        context,
      },
    });
  }
}

module.exports = AuditLoggerService;
