// src/modules/automation/services/builtInActions.service.js
const fetch = require('node-fetch'); // you may replace with undici/axios if needed

class BuiltInActions {
  constructor({ logger, prisma } = {}) {
    this.logger = logger;
    this.prisma = prisma;
  }

  // Test action: echo
  async test_action(meta = {}) {
    return { ok: true, echo: meta?.message ?? null };
  }

  // send_email: stub — integrates with your mailer later
  async send_email(meta = {}) {
    const { to, subject, body } = meta || {};
    if (!to || !subject) throw new Error('send_email requires "to" and "subject"');
    this.logger.info('send_email queued: %s %s', to, subject);
    // TODO: integrate actual mailer
    return { queued: true, to };
  }

  // http_call: perform external HTTP request
  async http_call(meta = {}) {
    if (!meta || !meta.url) throw new Error('http_call requires "url"');
    const res = await fetch(meta.url, {
      method: meta.method || 'GET',
      headers: meta.headers || {},
      body: meta.body ? JSON.stringify(meta.body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, body: text };
  }

  // more built-in actions can be added here...
  static listActions() {
    return [
      { name: 'test_action', type: 'builtin', description: 'Echo input', schema: { type: 'object', properties: { message: { type: 'string' } } } },
      { name: 'send_email', type: 'builtin', description: 'Send an email (stub)', schema: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['to','subject'] } },
      { name: 'http_call', type: 'builtin', description: 'Perform HTTP request', schema: { type: 'object', properties: { url: { type: 'string' }, method: { type: 'string' }, body: { type: 'object' } }, required: ['url'] } }
    ];
  }
}

module.exports = BuiltInActions;
