module.exports = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    cron: { type: 'string', minLength: 1 },
    enabled: { type: 'boolean' }
  },
  required: ['name', 'cron'],
  additionalProperties: false
};
