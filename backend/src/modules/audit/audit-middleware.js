
// ============================================================
// FILE 4: middleware/audit-middleware.js
// ============================================================

/**
 * Middleware to extract audit context from request
 */
function auditContextMiddleware() {
  return (req, res, next) => {
    // Extract client IP
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.ip ||
      req.connection.remoteAddress ||
      null;

    // Extract user agent
    const userAgent = req.headers["user-agent"] || null;

    // Extract user ID (from auth middleware)
    const userId = req.user?.id || null;

    // Store in request
    req.auditContext = {
      ip,
      userAgent,
      userId,
    };

    next();
  };
}

module.exports = { auditContextMiddleware };
