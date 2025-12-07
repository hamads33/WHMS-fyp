// src/modules/auth/middlewares/preventImpersonation.guard.js
module.exports = function preventImpersonation(req, res, next) {
  // req.auth.tokenPayload should be set by authGuard
  const payload = req.auth?.tokenPayload || {};
  if (payload.impersonatorId) {
    return res.status(403).json({ error: "Action not allowed while impersonating" });
  }
  return next();
};

