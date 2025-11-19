// src/modules/automation/pluginEngine/validator.js
// AJV-based validator with friendly error output

const Ajv = require('ajv').default;
const addFormats = require('ajv-formats').default;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function validateConfig(schema, data) {
  if (!schema) return { valid: true, errors: null, pretty: null };
  try {
    const validate = ajv.compile(schema);
    const valid = !!validate(data);
    const errors = validate.errors || null;
    const pretty = errors ? errors.map(e => {
      const inst = e.instancePath || '(root)';
      if (e.keyword === 'required' && e.params && e.params.missingProperty) {
        return `${inst} missing property '${e.params.missingProperty}'`;
      }
      if (e.keyword === 'type' && e.params && e.params.type) {
        return `${inst} should be type ${e.params.type}`;
      }
      return `${inst} ${e.message || ''}`.trim();
    }) : null;
    return { valid, errors, pretty };
  } catch (err) {
    return { valid: false, errors: [{ message: 'Schema compile error', detail: String(err) }], pretty: [`Schema compile error: ${String(err)}`] };
  }
}

module.exports = { validateConfig };
