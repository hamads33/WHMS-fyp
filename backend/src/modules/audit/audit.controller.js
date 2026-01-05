/**
 * Audit Logs Backend - Complete Implementation
 * ============================================================
 * 
 * Files to create:
 * 1. controllers/audit.controller.js
 * 2. services/audit-logger.service.js
 * 3. routes/audit.routes.js
 * 4. middleware/audit-middleware.js
 */

// ============================================================
// FILE 1: controllers/audit.controller.js
// ============================================================

class AuditController {
  constructor({ prisma, logger }) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * List all audit logs with advanced filtering
   */
  async listLogs(req, res) {
    try {
      const {
        source,
        action,
        actor,
        level,
        entity,
        userId,
        limit = 50,
        offset = 0,
        startDate,
        endDate,
      } = req.query;

      // Build where clause
      const where = {};

      if (source) where.source = source;
      if (action) where.action = action;
      if (actor) where.actor = actor;
      if (level) where.level = level;
      if (entity) where.entity = entity;
      if (userId) where.userId = userId;

      // Date range filtering
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
        take: Math.min(Math.max(Number(limit) || 50, 1), 100),
        skip: Math.max(Number(offset) || 0, 0),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          source: true,
          action: true,
          actor: true,
          level: true,
          meta: true,
          userId: true,
          entity: true,
          entityId: true,
          ip: true,
          userAgent: true,
          data: true,
          profileId: true,
          createdAt: true,
        },
      });

      this.logger.info(`Listed audit logs: ${logs.length} records, filters: ${JSON.stringify(where)}`);

      return res.success(logs);
    } catch (err) {
      this.logger.error("Failed to list audit logs:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Count total audit logs matching filters
   */
  async countLogs(req, res) {
    try {
      const {
        source,
        action,
        actor,
        level,
        entity,
        userId,
        startDate,
        endDate,
      } = req.query;

      const where = {};

      if (source) where.source = source;
      if (action) where.action = action;
      if (actor) where.actor = actor;
      if (level) where.level = level;
      if (entity) where.entity = entity;
      if (userId) where.userId = userId;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const total = await this.prisma.auditLog.count({ where });

      return res.success({ total });
    } catch (err) {
      this.logger.error("Failed to count audit logs:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Get logs for a specific entity
   */
  async getEntityLogs(req, res) {
    try {
      const { entityType, entityId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      if (!entityType || !entityId) {
        return res.fail("entityType and entityId are required", 400, "invalid_param");
      }

      const logs = await this.prisma.auditLog.findMany({
        where: {
          entity: entityType,
          entityId: String(entityId),
        },
        take: Math.min(Math.max(Number(limit) || 50, 1), 100),
        skip: Math.max(Number(offset) || 0, 0),
        orderBy: { createdAt: "desc" },
      });

      return res.success(logs);
    } catch (err) {
      this.logger.error("Failed to get entity logs:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Get logs for a specific user
   */
  async getUserLogs(req, res) {
    try {
      const { userId } = req.params;
      const { action, limit = 50, offset = 0 } = req.query;

      if (!userId) {
        return res.fail("userId is required", 400, "invalid_param");
      }

      const where = { userId };
      if (action) where.action = action;

      const logs = await this.prisma.auditLog.findMany({
        where,
        take: Math.min(Math.max(Number(limit) || 50, 1), 100),
        skip: Math.max(Number(offset) || 0, 0),
        orderBy: { createdAt: "desc" },
      });

      return res.success(logs);
    } catch (err) {
      this.logger.error("Failed to get user logs:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Get available audit sources and their actions
   */
  async getSources(req, res) {
    try {
      const sources = [
        {
          source: "auth",
          description: "Authentication and security events",
          actions: [
            "user.login",
            "user.logout",
            "user.register",
            "user.mfa_enabled",
            "user.mfa_disabled",
            "user.password_changed",
            "user.session_created",
            "user.session_revoked",
          ],
        },
        {
          source: "user",
          description: "User account management",
          actions: [
            "user.created",
            "user.updated",
            "user.deleted",
            "user.suspended",
            "user.restored",
            "user.role_assigned",
            "user.role_removed",
            "user.api_key_created",
            "user.api_key_revoked",
          ],
        },
        {
          source: "order",
          description: "Order and subscription management",
          actions: [
            "order.created",
            "order.activated",
            "order.suspended",
            "order.renewed",
            "order.cancelled",
            "order.terminated",
            "order.upgraded",
            "order.downgraded",
          ],
        },
        {
          source: "domain",
          description: "Domain registration and management",
          actions: [
            "domain.registered",
            "domain.renewed",
            "domain.transferred",
            "domain.updated",
            "domain.expired",
            "domain.grace_period",
            "domain.contact_updated",
            "domain.ns_updated",
          ],
        },
        {
          source: "automation",
          description: "Automation engine and tasks",
          actions: [
            "profile.created",
            "profile.updated",
            "profile.deleted",
            "profile.trigger",
            "profile.manual_run",
            "profile.complete",
            "profile.failed",
            "task.complete",
            "task.failed",
            "task.single.complete",
            "task.single.failed",
          ],
        },
        {
          source: "system",
          description: "System-level events",
          actions: [
            "system.backup",
            "system.restore",
            "system.config_updated",
            "system.error",
            "system.warning",
          ],
        },
      ];

      return res.success(sources);
    } catch (err) {
      this.logger.error("Failed to get audit sources:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Get audit log statistics
   */
  async getStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const where = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // Total logs
      const total = await this.prisma.auditLog.count({ where });

      // By level
      const byLevel = await this.prisma.auditLog.groupBy({
        by: ["level"],
        where,
        _count: true,
      });

      // By source
      const bySource = await this.prisma.auditLog.groupBy({
        by: ["source"],
        where,
        _count: true,
      });

      // Most recent errors
      const recentErrors = await this.prisma.auditLog.findMany({
        where: { ...where, level: "ERROR" },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      return res.success({
        total,
        byLevel: byLevel.map((item) => ({
          level: item.level,
          count: item._count,
        })),
        bySource: bySource.map((item) => ({
          source: item.source,
          count: item._count,
        })),
        recentErrors,
      });
    } catch (err) {
      this.logger.error("Failed to get audit stats:", err);
      return res.error(err, 500);
    }
  }
}

module.exports = AuditController;

// ============================================================
// FILE 5: Example Integration in Main App
// ============================================================

/*
// In your main app file (e.g., app.js or server.js):

const express = require('express');
const AuditController = require('./controllers/audit.controller');
const AuditLoggerService = require('./services/audit-logger.service');
const { createAuditRoutes } = require('./routes/audit.routes');
const { auditContextMiddleware } = require('./middleware/audit-middleware');

const app = express();

// Initialize Prisma and Logger (your existing setup)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('./lib/logger');

// Initialize audit service
const auditLogger = new AuditLoggerService({ prisma, logger });

// Initialize audit controller
const auditController = new AuditController({ prisma, logger });

// Add audit context middleware early
app.use(auditContextMiddleware());

// Mount audit routes
const auditRoutes = createAuditRoutes(auditController);
app.use('/api/audit', auditRoutes);

// Export for use in other modules
app.locals.auditLogger = auditLogger;

// ============================================================
// USAGE EXAMPLES IN YOUR CONTROLLERS
// ============================================================

// In order.controller.js
async create(req, res) {
  try {
    const order = await this.orderStore.create(req.body);

    // Log the action
    await req.app.locals.auditLogger.logOrderAction({
      action: 'order.created',
      orderId: order.id,
      userId: req.auditContext.userId,
      ip: req.auditContext.ip,
      meta: { planId: order.snapshotId },
      data: order,
    });

    return res.success(order, {}, 201);
  } catch (err) {
    await req.app.locals.auditLogger.logError({
      source: 'order',
      action: 'order.created',
      error: err,
      userId: req.auditContext.userId,
      context: req.body,
    });
    return res.error(err, 500);
  }
}

// In auth.controller.js
async login(req, res) {
  try {
    // ... login logic ...

    await req.app.locals.auditLogger.logAuthAction({
      action: 'user.login',
      userId: user.id,
      ip: req.auditContext.ip,
      userAgent: req.auditContext.userAgent,
      success: true,
      meta: { method: 'email_password' },
    });

    return res.success({ user, token });
  } catch (err) {
    await req.app.locals.auditLogger.logAuthAction({
      action: 'user.login',
      ip: req.auditContext.ip,
      userAgent: req.auditContext.userAgent,
      success: false,
      meta: { reason: err.message },
    });
    return res.error(err, 401);
  }
}
*/