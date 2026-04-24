const rateLimit = require("express-rate-limit");

const isDev = process.env.NODE_ENV !== "production";

function isLocalhost(req) {
  let ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "";
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  return ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
}

exports.loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 50 : 5,
  skip: (req) => isDev && isLocalhost(req),
  message: { error: "Too many login attempts. Try again later." }
});

exports.registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 50 : 3,
  skip: (req) => isDev && isLocalhost(req),
  message: { error: "Too many registrations. Try again later." }
});

exports.verifyLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 10,
  message: { error: "Too many verification requests." }
});
