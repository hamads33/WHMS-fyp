/**
 * FINAL DEVELOPMENT MAILER
 * -----------------------------------------
 * ✔ Never connects to SMTP
 * ✔ Never throws ECONNREFUSED
 * ✔ Logs outgoing emails to console
 * ✔ 100% compatible with current AuthService
 */

module.exports = {
  async sendMail({ to, subject, html, text }) {
    console.log("📧 MOCK EMAIL SENT");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("HTML:", html);
    console.log("TEXT:", text);
    console.log("──────────────────────────────");
  }
};
