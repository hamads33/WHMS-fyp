// ============================================================================
// Audit Log Middleware - Automatically capture request details
// Path: src/middleware/audit-log.middleware.js
// ============================================================================

const auditLogger = require("../shared/services/audit-logger.service");

/**
 * Middleware to extract and attach request context for audit logging
 * Should be placed early in the middleware chain
 */
function auditLogMiddleware(req, res, next) {
  // Attach audit context to request
  req.auditContext = {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
    timestamp: new Date(),
  };

  next();
}