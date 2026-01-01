const prisma = require("../../../../prisma/index");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendMail } = require("./email.service");
const AuditService = require("./audit.service");

const SALT = 12;

const PasswordResetService = {
  ////////////////////////////////////////////////////////////////
  // ADMIN-FORCED PASSWORD RESET (REPURPOSED METHOD)
  ////////////////////////////////////////////////////////////////
  async requestReset(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return true; // avoid enumeration

    const tempPassword = crypto.randomBytes(6).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, SALT);

    // update password + force change
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        forcePasswordChange: true
      }
    });

    // revoke all sessions
    await prisma.session.deleteMany({
      where: { userId: user.id }
    });

    // notify user (FIXED sendMail SIGNATURE)
    await sendMail({
      to: user.email,
      subject: "Your password was reset by an administrator",
      html: `
        <p>Your account password has been reset by an administrator.</p>
        <p><b>Temporary password:</b> ${tempPassword}</p>
        <p>Please log in and change it immediately.</p>
      `
    });

    // audit
    try {
      await AuditService.log({
        userId: user.id,
        action: "admin.password.reset",
        entity: "user",
        entityId: user.id
      });
    } catch (e) {}

    return true;
  },

  ////////////////////////////////////////////////////////////////
  // VERIFY TOKEN (USED BY USER RESET PAGE REDIRECT)
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
  // RESET PASSWORD (USER SELF RESET FINAL STEP)
  ////////////////////////////////////////////////////////////////
  async resetPassword(rawToken, newPassword) {
    const tokenRow = await this.verifyToken(rawToken);
    if (!tokenRow) throw new Error("Invalid or expired token");

    const passwordHash = await bcrypt.hash(newPassword, SALT);

    await prisma.user.update({
      where: { id: tokenRow.userId },
      data: { passwordHash }
    });

    await prisma.emailToken.update({
      where: { id: tokenRow.id },
      data: { used: true }
    });

    await prisma.session.deleteMany({
      where: { userId: tokenRow.userId }
    });

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
