// src/modules/automation/actions/send_email.js
// Built-in example action (keeps your original logic)

module.exports = {
  id: 'send_email',
  name: 'Send Email (example)',
  version: '1.0.0',
  description: 'Example email sender. Replace with nodemailer/sendgrid in prod.',
  aliases: { message: 'body' },
  jsonSchema: {
    type: 'object',
    required: ['to', 'subject', 'body'],
    properties: {
      to: { type: 'string', format: 'email' },
      subject: { type: 'string' },
      body: { type: 'string' }
    }
  },
  async execute(ctx, params) {
    const { to, subject, body } = params;
    console.log(`[send_email] sending to=${to} subject=${subject}`);
    return { success: true, message: `mock-email-sent to ${to}`, meta: { subject, body } };
  },
  async test(params) {
    return this.execute({ test: true }, params);
  }
};
