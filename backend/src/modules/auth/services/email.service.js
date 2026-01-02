// src/modules/auth/services/email.service.js

/**
 * Email service
 * - Uses mock queue in test environment
 * - Uses SMTP (Mailtrap / real SMTP) otherwise
 */

if (process.env.NODE_ENV === "test") {
  // Jest / test environment → mock email queue
  module.exports = require("../../../../tests/helpers/mockEmailQueue");
} else {
  const nodemailer = require("nodemailer");

  // ------------------------------------------------------------------
  // Validate required SMTP configuration early (fail fast)
  // ------------------------------------------------------------------
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM,
    MAIL_FROM_NAME,
    MAIL_FROM_ADDRESS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP configuration missing. Check SMTP_HOST, SMTP_USER, SMTP_PASS in env."
    );
  }

  // ------------------------------------------------------------------
  // Create transporter
  // ------------------------------------------------------------------
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: false, // STARTTLS (Mailtrap compatible)
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // ------------------------------------------------------------------
  // Resolve sender address safely
  // ------------------------------------------------------------------
  function resolveFrom() {
    if (MAIL_FROM) return MAIL_FROM;

    const name = MAIL_FROM_NAME || "App";
    const address = MAIL_FROM_ADDRESS || "no-reply@localhost";

    return `"${name}" <${address}>`;
  }

  // ------------------------------------------------------------------
  // Public sendMail API (USED BY EmailTokenService)
  // ------------------------------------------------------------------
  async function sendMail({ to, subject, text, html }) {
    if (!to) throw new Error("EmailService.sendMail: 'to' is required");
    if (!subject) throw new Error("EmailService.sendMail: 'subject' is required");

    await transporter.sendMail({
      from: resolveFrom(),
      to,
      subject,
      text,
      html,
    });
  }

  module.exports = {
    sendMail,
  };
}
