/**
 * Audit Module Initializer
 * =====================================================
 * Responsibility:
 * - Instantiate AuditLoggerService
 * - Instantiate AuditController
 * - Mount audit routes
 * - Expose auditLogger to app for cross-module usage
 */

const AuditLoggerService = require("./audit-logger.service");
const AuditController = require("./audit.controller");
const { createAuditRoutes } = require("./audit.routes");

const { auditContextMiddleware } = require("./audit-middleware");

function initAuditModule({ app, prisma, logger }) {
  if (!app) throw new Error("AuditModule: app instance is required");
  if (!prisma) throw new Error("AuditModule: prisma instance is required");

  logger?.info("📝 Initializing Audit Module...");

  // Initialize service
  const auditLogger = new AuditLoggerService({ prisma, logger });

  // Initialize controller
  const auditController = new AuditController({ prisma, logger });

  // Register middleware early (for context extraction)
  app.use(auditContextMiddleware());

  // Mount routes
  const auditRoutes = createAuditRoutes(auditController);
  app.use("/api/audit", auditRoutes);

  // Expose audit logger globally for other modules
  app.locals.auditLogger = auditLogger;

  logger?.info("✅ Audit Module Ready");

  return {
    auditLogger,
    auditController,
    routes: auditRoutes,
  };
}

module.exports = { initAuditModule };
