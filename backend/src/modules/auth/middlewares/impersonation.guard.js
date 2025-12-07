const TokenService = require("../services/token.service");

module.exports = function impersonationGuard(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return next();

  const token = auth.replace("Bearer ", "");
  const payload = TokenService.verifyAccessToken(token);
  if (!payload) return next();

  // Already attached by authGuard
  if (!req.user) req.user = { id: payload.userId };

  if (payload.impersonatorId) {
    req.user.impersonatorId = payload.impersonatorId;
    req.user.isImpersonation = true;
  }

  return next();
};

