const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const manifestSchema = {
  type: 'object',
  required: ['id', 'name', 'version', 'actions'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    version: { type: 'string' },
    author: { type: 'string' },
    description: { type: 'string' },
    actions: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    dependencies: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    permissions: {
      type: 'array',
      items: { type: 'string' }
    },
    signature: { type: 'string' }
  },
  additionalProperties: true
};

const validate = ajv.compile(manifestSchema);

module.exports = { validate, ajv };
