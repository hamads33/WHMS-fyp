/**
 * Generic validation middleware for Joi schemas
 * Usage: router.post('/path', validate(mySchema), controller.method)
 */
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const messages = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        return res.status(400).json({
          error: "Validation failed",
          details: messages,
        });
      }

      // Replace body with validated data
      req.body = value;
      next();
    } catch (err) {
      res.status(500).json({
        error: "Validation error",
        message: err.message,
      });
    }
  };
};

module.exports = validate;