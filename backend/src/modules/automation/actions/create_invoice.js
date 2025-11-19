// src/modules/automation/actions/create_invoice.js
// Built-in example action (keeps your original logic)

module.exports = {
  id: 'create_invoice',
  name: 'Create Invoice (example)',
  version: '1.0.0',
  description: 'Creates a mock invoice. Replace with billing module integration.',
  jsonSchema: {
    type: 'object',
    required: ['clientId', 'amount'],
    properties: {
      clientId: { type: 'integer' },
      amount: { type: 'number' },
      dueInDays: { type: 'integer', default: 7 }
    }
  },
  async execute(ctx, params) {
    const invoiceId = `inv_${Date.now()}`;
    return { success: true, invoiceId, params };
  }
};
