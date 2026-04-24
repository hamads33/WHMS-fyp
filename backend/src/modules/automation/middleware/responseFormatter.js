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
  /**
   * res.success(data, meta, status)
   * Standard success response
   */
  res.success = (data = null, meta = {}, status = 200) => {
    return res.status(status).json({
      success: true,
      data,
      meta
    });
  };

  /**
   * res.fail(message, status, code, details)
   * Standard error response
   */
  res.fail = (message = "Bad Request", status = 400, code = "bad_request", details = null) => {
    return res.status(status).json({
      success: false,
      error: {
        message,
        code,
        details
      }
    });
  };

  /**
   * res.error(err, defaultStatus)
   * Handle Error objects properly
   */
  res.error = (err, defaultStatus = 500) => {
    if (err instanceof Error) {
      return res.fail(
        err.message,
        err.status || defaultStatus,
        err.code || "internal_error",
        err.meta || null
      );
    }
    return res.fail("Unknown error", defaultStatus);
  };

  return next();
}

module.exports = responseFormatter;