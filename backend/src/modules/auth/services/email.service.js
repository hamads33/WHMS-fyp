// src/modules/auth/services/email.service.js

// If in test mode → use mock email queue
if (process.env.NODE_ENV === "test") {
  module.exports = require("../../../../tests/helpers/mockEmailQueue");
} else {
  const nodemailer = require("nodemailer");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  async function sendMail({ to, subject, text, html }) {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text,
      html
    });
  }

  module.exports = { sendMail };
}
