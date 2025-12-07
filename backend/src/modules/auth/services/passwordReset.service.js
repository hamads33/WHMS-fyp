const prisma = require("../../../../prisma/index");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendMail } = require("./email.service");
const AuditService = require("./audit.service");

const SALT = 12;

const PasswordResetService = {
  ////////////////////////////////////////////////////////////////
  // REQUEST PASSWORD RESET EMAIL
  ////////////////////////////////////////////////////////////////
  async requestReset(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return true; // do nothing to prevent email enumeration

    // create raw token
    const raw = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(raw, SALT);

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    await prisma.emailToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        type: "password_reset",
        expiresAt
      }
    });

    const link = `${process.env.APP_URL}/api/auth/password/reset?token=${raw}`;

    const html = `
      <p>Hello ${user.email},</p>
      <p>You requested to reset your password.</p>
      <p><a href="${link}">Click here to reset your password</a></p>
      <p>This link expires in 30 minutes.</p>
    `;

    await sendMail(user.email, "Reset Your Password", html);

    // audit
    try {
      await AuditService.log({
        userId: user.id,
        action: "password.reset.email_sent",
        entity: "user",
        entityId: user.id
      });
    } catch (e) {}

    return true;
  },

  ////////////////////////////////////////////////////////////////
  // VERIFY TOKEN (for GET /reset?token=)
  ////////////////////////////////////////////////////////////////
  async verifyToken(raw) {
    const rows = await prisma.emailToken.findMany({
      where: { type: "password_reset", used: false }
    });

    for (const r of rows) {
      if (r.expiresAt < new Date()) continue;
      if (await bcrypt.compare(raw, r.tokenHash)) {
        return r;
      }
    }
    return null;
  },

  ////////////////////////////////////////////////////////////////
  // RESET PASSWORD
  ////////////////////////////////////////////////////////////////
  async resetPassword(rawToken, newPassword) {
    const tokenRow = await this.verifyToken(rawToken);
    if (!tokenRow) throw new Error("Invalid or expired token");

    const passwordHash = await bcrypt.hash(newPassword, SALT);

    // update password
    await prisma.user.update({
      where: { id: tokenRow.userId },
      data: { passwordHash }
    });

    // mark token as used
    await prisma.emailToken.update({
      where: { id: tokenRow.id },
      data: { used: true }
    });

    // invalidate existing sessions (logout everywhere)
    await prisma.session.deleteMany({
      where: { userId: tokenRow.userId }
    });

    // audit
    try {
      await AuditService.log({
        userId: tokenRow.userId,
        action: "password.reset.completed",
        entity: "user",
        entityId: tokenRow.userId
      });
    } catch (e) {}

    return true;
  }
};

module.exports = PasswordResetService;
