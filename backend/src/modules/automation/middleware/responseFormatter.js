/**
 * Response Formatter Middleware
 * ------------------------------------------------------------------
 * Standardizes API responses across Automation module.
 *
 * Benefits:
 *  - Consistent API contract
 *  - Easier frontend integration
 *  - Cleaner controllers
 */

function responseFormatter(req, res, next) {
  res.success = (data = null, meta = {}) => {
    return res.status(res.statusCode && res.statusCode !== 200 ? res.statusCode : 200).json({
      success: true, data, meta
    });
  };

  res.fail = (message = "Bad Request", status = 400, code = "bad_request", details = null) => {
    return res.status(status).json({
      success: false,
      error: { message, code, details }
    });
  };

  res.error = (err) => next(err);

  return next();
}

module.exports = responseFormatter;
