const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  logger.error(err.message, { stack: err.stack, path: req.path });

  const status = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  res.status(status).json({ success: false, error: message });
}

module.exports = { errorHandler };
