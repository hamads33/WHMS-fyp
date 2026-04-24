module.exports = function impersonationMiddleware(req, res, next) {
  if (!req.user) return next();

  if (req.user.impersonatorId) {
    req.user.isImpersonation = true;
    req.impersonator = { id: req.user.impersonatorId };
  } else {
    req.user.isImpersonation = false;
    req.impersonator = null;
  }

  next();
};

