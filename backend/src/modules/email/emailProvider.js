// src/providers/emailProvider.js
const nodemailer = require('nodemailer');
const sendgrid = require('@sendgrid/mail');

const providerName = process.env.EMAIL_PROVIDER || 'smtp';
const fromEmail = process.env.FROM_EMAIL || 'noreply@example.com';
const fromName = process.env.FROM_NAME || 'WHMS';

let smtpTransporter = null;
if (providerName === 'smtp') {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else if (providerName === 'sendgrid') {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendMail({ to, toName, subject, html, text, jobId }) {
  if (providerName === 'smtp') {
    const info = await smtpTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject,
      text,
      html,
      headers: {
        'X-Job-Id': jobId,
      },
    });
    return { provider: 'smtp', id: info.messageId, response: info };
  } else if (providerName === 'sendgrid') {
    const msg = {
      to,
      from: { email: fromEmail, name: fromName },
      subject,
      text,
      html,
      headers: { 'X-Job-Id': jobId },
    };
    const res = await sendgrid.send(msg);
    return { provider: 'sendgrid', id: res[0].headers['x-message-id'] || res[0].statusCode };
  } else {
    throw new Error(`Unknown email provider: ${providerName}`);
  }
}

module.exports = { sendMail, providerName };
