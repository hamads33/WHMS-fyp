const Ajv = require("ajv");

const ajv = new Ajv({
  allErrors: true,
  strict: false
});

const manifestSchema = require("./validators/manifest.schema");
const validateFn = ajv.compile(manifestSchema);

module.exports = {
  validate(manifest) {
    const valid = validateFn(manifest);
    return {
      valid,
      errors: validateFn.errors || []
    };
  }
};
