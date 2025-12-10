module.exports = function auditContext() {
  return (req, res, next) => {
    req.clientIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
    req.userAgent = req.headers["user-agent"] || null;

    // If auth middleware exists, it should populate req.user = { id: ... }
    const userId = req.user?.id || null;

    req.auditContext = {
      userId,
      ip: req.clientIp,
      userAgent: req.userAgent
    };

    next();
  };
};
