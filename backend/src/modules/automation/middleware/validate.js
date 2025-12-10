const Ajv = require("ajv").default;
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true, coerceTypes: true, removeAdditional: true });
addFormats(ajv);

module.exports = function validate(schema, source = "body") {
  const fn = ajv.compile(schema);

  return (req, res, next) => {
    const data = req[source];
    const ok = fn(data);

    if (!ok) {
      return res.fail("Validation failed", 400, "validation_error", fn.errors);
    }

    next();
  };
};
