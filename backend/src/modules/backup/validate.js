module.exports.validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data; // sanitized & typed
      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: err.errors,
      });
    }
  };
};
