// src/modules/automation/services/audit.service.js
const path = require('path');

class AuditService {
  /**
   * prisma: PrismaClient or null
   * logger: automation logger
   */
  constructor({ prisma, logger }) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * write audit event (non-blocking for main flow)
   * source: string, action: string, actor: string, meta: object, level: 'INFO'|'WARN'|'ERROR'
   */
  async log(source = 'automation', action = 'unknown', actor = 'system', meta = {}, level = 'INFO') {
    const payload = {
      source,
      action,
      actor,
      meta: meta || {},
      level
    };

    // best-effort DB write
    if (this.prisma && this.prisma.auditLog) {
      try {
        await this.prisma.auditLog.create({ data: payload });
      } catch (err) {
        // do not throw - audit must not break flows
        this.logger.error('Audit DB write failed: %s', err.stack || err);
      }
    }

    // log to automation logger
    try {
      this.logger.info('AUDIT %s %s %s %o', source, action, actor, meta);
    } catch (err) {
      // swallow
      console.error('AUDIT LOG FAIL', err);
    }
  }
}

module.exports = AuditService;
