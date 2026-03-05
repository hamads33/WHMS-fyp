// src/modules/email/emailProvider.js
// Fully dynamic — reads provider/SMTP settings from DB on every call.
// Falls back to .env so the app works on first boot before settings are saved.
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Load settings from DB, fall back to env vars
// ─────────────────────────────────────────────────────────────────────────────
async function loadConfig() {
  let rows = [];
  try {
    rows = await prisma.emailSetting.findMany();
  } catch (_) {
    // DB might not be ready on first boot — env fallback handles it
  }
  const s = rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});

  return {
    provider:      s.email_provider    || process.env.EMAIL_PROVIDER    || 'smtp',
    smtpHost:      s.smtp_host         || process.env.SMTP_HOST         || 'localhost',
    smtpPort:      parseInt(s.smtp_port || process.env.SMTP_PORT        || '587', 10),
    smtpSecure:   (s.smtp_secure       || process.env.SMTP_SECURE       || 'false') === 'true',
    smtpUser:      s.smtp_user         || process.env.SMTP_USER         || '',
    smtpPass:      s.smtp_pass         || process.env.SMTP_PASS         || '',
    fromEmail:     s.smtp_from_email   || process.env.SMTP_FROM         || process.env.MAIL_FROM_ADDRESS || 'noreply@example.com',
    fromName:      s.smtp_from_name    || process.env.MAIL_FROM_NAME    || 'WHMS',
    replyTo:       s.smtp_reply_to     || process.env.MAIL_REPLY_TO     || '',
    sendgridKey:   s.sendgrid_key      || process.env.SENDGRID_API_KEY  || '',
    mailgunKey:    s.mailgun_key       || process.env.MAILGUN_API_KEY   || '',
    mailgunDomain: s.mailgun_domain    || process.env.MAILGUN_DOMAIN    || '',
    awsRegion:     s.aws_region        || process.env.AWS_REGION        || 'us-east-1',
    postmarkToken: s.postmark_token    || process.env.POSTMARK_SERVER_TOKEN || '',
  };
}

function makeSmtpTransport(cfg) {
  // Port 465 = direct SSL wrapper; 587 / 2525 / 25 = plain + STARTTLS upgrade
  // Never blindly trust cfg.smtpSecure — derive it from the port to avoid the
  // "wrong version number" TLS error when the port expects plain-first.
  const secure = cfg.smtpPort === 465;
  return nodemailer.createTransport({
    host:   cfg.smtpHost,
    port:   cfg.smtpPort,
    secure,
    auth:   cfg.smtpUser ? { user: cfg.smtpUser, pass: cfg.smtpPass } : undefined,
    tls:    { rejectUnauthorized: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEND FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function sendMail({ to, toName, subject, html, text, jobId, replyTo: jobReplyTo }) {
  const cfg = await loadConfig();
  const fromFull       = `"${cfg.fromName}" <${cfg.fromEmail}>`;
  const effectiveReplyTo = jobReplyTo || cfg.replyTo || cfg.fromEmail;
  const headers        = { 'X-Job-Id': jobId || '' };

  switch (cfg.provider) {
    case 'smtp': {
      const transport = makeSmtpTransport(cfg);
      const info = await transport.sendMail({
        from: fromFull,
        to: toName ? `"${toName}" <${to}>` : to,
        replyTo: effectiveReplyTo,
        subject,
        text: text || '',
        html,
        headers,
      });
      return { provider: 'smtp', id: info.messageId, response: info.response };
    }

    case 'sendgrid': {
      const sg = require('@sendgrid/mail');
      sg.setApiKey(cfg.sendgridKey);
      const res = await sg.send({
        to: toName ? { email: to, name: toName } : to,
        from: { email: cfg.fromEmail, name: cfg.fromName },
        replyTo: effectiveReplyTo,
        subject, text: text || '', html, headers,
      });
      return { provider: 'sendgrid', id: res[0].headers['x-message-id'] || String(res[0].statusCode) };
    }

    case 'mailgun': {
      const Mailgun   = require('mailgun.js');
      const FormData  = require('form-data');
      const mg        = new Mailgun(FormData);
      const client    = mg.client({ username: 'api', key: cfg.mailgunKey });
      if (!cfg.mailgunDomain) throw new Error('Mailgun domain not configured');
      const res = await client.messages.create(cfg.mailgunDomain, {
        from: fromFull,
        to: toName ? `${toName} <${to}>` : to,
        'h:Reply-To': effectiveReplyTo,
        subject, text: text || '', html,
        'h:X-Job-Id': jobId || '',
      });
      return { provider: 'mailgun', id: res.id };
    }

    case 'ses': {
      const aws  = require('@aws-sdk/client-ses');
      const { defaultProvider } = require('@aws-sdk/credential-provider-node');
      const { createTransport } = require('nodemailer');
      const sesClient = new aws.SES({ region: cfg.awsRegion, credentials: defaultProvider() });
      const transport = createTransport({ SES: { ses: sesClient, aws } });
      const info = await transport.sendMail({
        from: fromFull,
        to: toName ? `"${toName}" <${to}>` : to,
        replyTo: effectiveReplyTo,
        subject, text: text || '', html, headers,
      });
      return { provider: 'ses', id: info.messageId };
    }

    case 'postmark': {
      const postmark = require('postmark');
      const client   = new postmark.ServerClient(cfg.postmarkToken);
      const res = await client.sendEmail({
        From: fromFull, To: to, ReplyTo: effectiveReplyTo,
        Subject: subject, HtmlBody: html, TextBody: text || '',
        Headers: [{ Name: 'X-Job-Id', Value: jobId || '' }],
      });
      return { provider: 'postmark', id: res.MessageID };
    }

    default:
      throw new Error(`Unknown email provider: "${cfg.provider}". Supported: smtp, sendgrid, mailgun, ses, postmark`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTION TEST
// ─────────────────────────────────────────────────────────────────────────────
async function verifyConnection() {
  const cfg = await loadConfig();
  if (cfg.provider !== 'smtp') return { ok: true, provider: cfg.provider };

  const transport = makeSmtpTransport(cfg);
  try {
    await transport.verify();
    return { ok: true, provider: 'smtp', host: cfg.smtpHost, port: cfg.smtpPort };
  } catch (err) {
    return { ok: false, provider: 'smtp', error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED env vars → DB on first boot (idempotent)
// ─────────────────────────────────────────────────────────────────────────────
async function seedEnvSettings() {
  const defaults = [
    { key: 'email_provider',  value: process.env.EMAIL_PROVIDER    || 'smtp',                          category: 'provider' },
    { key: 'smtp_host',       value: process.env.SMTP_HOST         || 'sandbox.smtp.mailtrap.io',      category: 'smtp' },
    { key: 'smtp_port',       value: process.env.SMTP_PORT         || '2525',                          category: 'smtp' },
    { key: 'smtp_secure',     value: process.env.SMTP_SECURE       || 'false',                         category: 'smtp' },
    { key: 'smtp_user',       value: process.env.SMTP_USER         || '',                              category: 'smtp' },
    { key: 'smtp_pass',       value: process.env.SMTP_PASS         || '',                              category: 'smtp' },
    { key: 'smtp_from_email', value: process.env.SMTP_FROM         || process.env.MAIL_FROM_ADDRESS || 'noreply@whms.local', category: 'smtp' },
    { key: 'smtp_from_name',  value: process.env.MAIL_FROM_NAME    || 'WHMS',                          category: 'smtp' },
  ];

  for (const { key, value, category } of defaults) {
    if (!value) continue;
    await prisma.emailSetting.upsert({
      where:  { key },
      update: {},              // don't overwrite if already set by admin
      create: { key, value, category },
    });
  }
  console.log('✅ Email settings seeded from env vars');
}

module.exports = { sendMail, verifyConnection, seedEnvSettings, loadConfig };
