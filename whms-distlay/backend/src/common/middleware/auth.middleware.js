const jwt = require('jsonwebtoken');
const config = require('../../config');
const { unauthorized } = require('../utils/response');

function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized(res);
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    const { forbidden } = require('../utils/response');
    return forbidden(res);
  }
  next();
}

module.exports = { authenticate, requireAdmin };
