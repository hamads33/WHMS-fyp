const AuditService = require("../services/audit.service");
module.exports = function audit(actionGetter) {
  return async (req, res, next) => {
    try {
      await AuditService.log({
        actorId: req.user?.id || null,
        action: actionGetter(req),
        resource: null,
        metadata: { ip: req.ip, userAgent: req.get("User-Agent") }
      });
    } catch (e) { console.error("audit error", e); }
    return next();
  };
};

