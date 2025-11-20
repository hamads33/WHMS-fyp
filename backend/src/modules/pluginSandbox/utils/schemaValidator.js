// src/pluginSandbox/utils/schemaValidator.js
const Ajv = require("ajv");

const ajv = new Ajv({
  allErrors: true,
  strict: false
});

module.exports = function validate(schema, data) {
  if (!schema) return { valid: true, errors: [] };

  const validate = ajv.compile(schema);
  const valid = validate(data);

  return {
    valid,
    errors: validate.errors || [],
    pretty: validate.errors?.map(e => `${e.instancePath} ${e.message}`)
  };
};
