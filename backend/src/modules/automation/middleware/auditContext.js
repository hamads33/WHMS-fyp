/**
 * Audit Context Middleware
 * ------------------------------------------------------------------
 * Extracts request metadata for audit logging.
 *
 * Populates req.auditContext with:
 *  - userId (from auth middleware if present)
 *  - ip (client IP, respecting X-Forwarded-For)
 *  - userAgent (browser/client info)
 *
 * Requirements:
 *  - Auth middleware should populate req.user.id
 *  - Must be placed AFTER responseFormatter middleware
 */

module.exports = function auditContext() {
  return (req, res, next) => {
    // Extract client IP (req.ip is already normalized by app-level middleware)
    const clientIp = req.ip || null;

    // Extract user agent
    const userAgent = req.headers["user-agent"] || null;

    // Extract user ID (populated by auth middleware if authenticated)
    const userId = req.user?.id || null;

    // Populate audit context on request object
    req.auditContext = {
      requestId: req.id || null,
      userId,
      ip: clientIp,
      userAgent
    };

    next();
  };
};