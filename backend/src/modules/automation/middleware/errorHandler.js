const crypto = require("crypto");

function automationErrorHandler(logger) {
  return (err, req, res, next) => {
    const id = crypto.randomBytes(5).toString("hex");
    const status = err.status || 500;

    logger.error("AutomationError %s %o", id, err);

    res.status(status).json({
      success: false,
      error: {
        id,
        message: status === 500 ? "Internal Server Error" : err.message,
        code: err.code || "automation_error",
        meta: err.meta || null
      }
    });
  };
}

module.exports = automationErrorHandler;
