// src/modules/marketplace/middleware/auth.middleware.js

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: "Authentication required",
    });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: "Authentication required",
    });
  }

  const isAdmin = req.user.roles?.some(r => r.role?.name === "admin");

  if (!isAdmin) {
    return res.status(403).json({
      ok: false,
      error: "Admin role required",
    });
  }

  next();
}

function requireDeveloper(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: "Authentication required",
    });
  }

  const isDeveloper = req.user.roles?.some(
    r => r.role?.name === "developer"
  );

  if (!isDeveloper) {
    return res.status(403).json({
      ok: false,
      error: "Developer role required",
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireDeveloper,
};
