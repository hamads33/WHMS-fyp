const rateLimit = require("express-rate-limit");

exports.loginLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 5,
  message: { error: "Too many login attempts. Try again later." }
});

exports.registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: "Too many registrations. Try again later." }
});

exports.verifyLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 10,
  message: { error: "Too many verification requests." }
});
