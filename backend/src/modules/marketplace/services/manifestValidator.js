// src/modules/marketplace/services/manifestValidator.js

const Ajv = require("ajv");
const schema = require("../../plugins/validators/manifest.schema");

const ajv = new Ajv({ allErrors: true });
const validateFn = ajv.compile(schema);

module.exports = {
  validate(manifest) {
    const valid = validateFn(manifest);

    if (!valid) {
      return {
        valid: false,
        errors: validateFn.errors,
        warnings: []
      };
    }

    return { valid: true, errors: [], warnings: [] };
  }
};
