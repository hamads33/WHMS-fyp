// src/modules/automation/utils/validator.js
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats').default;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

/**
 * Convert AJV errors to friendly messages
 * @param {Array} errors
 * @returns {string[]}
 */
function formatAjvErrors(errors = []) {
  return errors.map(err => {
    const instance = err.instancePath || '(root)';
    const schemaPath = err.schemaPath || '';
    const keyword = err.keyword || '';
    const msg = err.message || JSON.stringify(err);
    if (keyword === 'required' && err.params && err.params.missingProperty) {
      return `${instance} missing property '${err.params.missingProperty}'`;
    }
    // nicer for types
    if (keyword === 'type' && err.params && err.params.type) {
      return `${instance} should be type ${err.params.type}`;
    }
    return `${instance} ${msg} (${schemaPath})`;
  });
}

/**
 * Validate `data` against `schema`. Returns { valid, errors, pretty }.
 */
function validateSchema(schema, data) {
  if (!schema) return { valid: true, errors: null, pretty: null };
  const validate = ajv.compile(schema);
  const valid = validate(data);
  const errors = validate.errors || null;
  const pretty = errors ? formatAjvErrors(errors) : null;
  return { valid, errors, pretty };
}

module.exports = { validateSchema, formatAjvErrors };
