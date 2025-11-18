// src/modules/automation/actions/send_email.js
module.exports = {
  id: 'send_email',
  name: 'Send Email (example)',
  version: '1.0.0',
  description: 'Example email sender. Replace with nodemailer/sendgrid in prod.',
  // alias mapping so older tasks with "message" will be normalized to "body"
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
    // Replace with real mailer integration — this is a mock
    const { to, subject, body } = params;
    // Simulate sending...
    console.log(`[send_email] sending to=${to} subject=${subject}`);
    return { success: true, message: `mock-email-sent to ${to}`, meta: { subject, body } };
  },
  async test(params) {
    return this.execute({ test: true }, params);
  }
};
