const nodemailer = require("nodemailer");

let transporter;

try {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} catch (e) {
  console.warn("⚠ No SMTP configured — falling back to console mailer");
  transporter = null;
}

module.exports = {
  async sendMail(data) {
    if (!transporter) {
      console.log("📨 EMAIL (FAKE SEND):", data);
      return;
    }

    try {
      await transporter.sendMail(data);
    } catch (err) {
      console.error("SMTP send error → fallback:", err.message);
      console.log("📨 EMAIL (FAKE SEND):", data);
    }
  }
};
