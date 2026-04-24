const prisma = require("../../../../prisma/index");
const bcrypt = require("bcrypt");
const EmailTokenService = require("../services/emailToken.service");
const AuditService = require("../services/audit.service");
const SALT = 12;

const AccountController = {
  // POST /auth/request-password-reset { email }
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "email required" });

      // Rate limiting inside EmailTokenService
      const user = await prisma.user.findUnique({ where: { email }});
      if (!user) return res.json({ ok: true }); // avoid enumeration

      await EmailTokenService.sendPasswordResetEmail(user);

      // audit: password reset requested
      await AuditService.log({
        userId: user.id,
        action: "password_reset.request",
        entity: "user",
        entityId: user.id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        data: { email }
      });

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: err.message });
    }
  },

  // POST /auth/reset-password { token, newPassword }
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).json({ error: "token & newPassword required" });

      const row = await EmailTokenService.verifyToken(token, "password_reset");
      if (!row) return res.status(400).json({ error: "Invalid or expired token" });

      const hash = await bcrypt.hash(newPassword, SALT);
      await prisma.user.update({ where: { id: row.userId }, data: { passwordHash: hash }});

      // invalidate sessions
      await prisma.session.deleteMany({ where: { userId: row.userId }});

      // send notification email
      const u = await prisma.user.findUnique({ where: { id: row.userId }});
      await EmailTokenService.sendPasswordChangedEmail(u.email);

      // audit
      await AuditService.log({
        userId: row.userId,
        action: "password_reset.complete",
        entity: "user",
        entityId: row.userId,
        ip: req.ip,
        userAgent: req.get("User-Agent")
      });

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: err.message });
    }
  },

  // POST /auth/send-verify-email (protected)
  async sendVerifyEmail(req, res) {
    try {
      await EmailTokenService.sendVerificationEmail(req.user);
      await AuditService.log({
        userId: req.user.id,
        action: "email.verification.sent",
        entity: "user",
        entityId: req.user.id,
        ip: req.ip,
        userAgent: req.get("User-Agent")
      });
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: err.message });
    }
  },

  // GET /auth/verify-email?token=...
  async verifyEmail(req, res) {
    try {
      const token = req.query.token;
      const row = await EmailTokenService.verifyToken(token, "verify_email");
      if (!row) return res.status(400).send("Invalid or expired token");

      await prisma.user.update({ where: { id: row.userId }, data: { isEmailVerified: true }});

      await AuditService.log({
        userId: row.userId,
        action: "email.verified",
        entity: "user",
        entityId: row.userId,
        ip: req.ip,
        userAgent: req.get("User-Agent")
      });

      return res.send("Email verified");
    } catch (err) {
      console.error(err);
      return res.status(400).send("Error");
    }
  }
};

module.exports = AccountController;
