// src/modules/auth/middlewares/ipAccess.guard.js
const IpAccessService = require("../services/ipAccess.service");

/**
 * Use this middleware before login route (or early in auth flow).
 * Example: app.post('/api/auth/login', ipAccessGuard, loginLimiter, AuthController.login)
 */
async function ipAccessGuard(req, res, next) {
  try {
    // common proxies: if behind reverse proxy you might want req.headers['x-forwarded-for']
    const ip = (req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
    const denied = await IpAccessService.isIpDenied(ip);

    if (denied) {
      return res.status(403).json({ error: "Access from this IP is blocked" });
    }
    return next();
  } catch (err) {
    // on service failure, fail-open (do not break login flow)
    console.error("ipAccessGuard error:", err);
    return next();
  }
}

module.exports = ipAccessGuard;





// Where to use: add this middleware before the login route 
// (and any other sensitive public endpoints you want to protect), e.g.:

// const ipAccessGuard = require("./middlewares/ipAccess.guard");

// // in your auth.routes.js
// router.post("/login", ipAccessGuard, loginLimiter, AuthController.login);