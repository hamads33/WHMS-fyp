// src/modules/auth/services/emailToken.service.js
const prisma = require("../../../../prisma");
const crypto = require("crypto");
const Mailer = require("./email.service"); // in test env this resolves to mockEmailQueue
const bcrypt = require("bcrypt");

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

const EmailTokenService = {
  //--------------------------------------------------
  // Create token (store hash in DB)
  //--------------------------------------------------
  async _createToken(userId, type) {
    const token = crypto.randomBytes(32).toString("hex"); // plaintext sent to user
    const tokenHash = sha256(token);

    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

    await prisma.emailToken.create({
      data: {
        userId,
        tokenHash,
        type, // expected values like "verify" or "reset"
        expiresAt
      }
    });

    return token;
  },

  //--------------------------------------------------
  // Send verification email
  //--------------------------------------------------
  async sendVerificationEmail(user, origin) {
    if (!user || !user.email) throw new Error("Invalid user");

    const token = await this._createToken(user.id, "verify");

    // Tests expect to find an API route link. Include both API and frontend links.
    const base = (origin || process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
    const apiVerifyUrl = `${base}/api/auth/email/verify?token=${token}`;
    const webVerifyUrl = `${base}/auth/verify?token=${token}`;

    const html = [
      `<p>Verify your email by clicking the link below:</p>`,
      `<p><a href="${apiVerifyUrl}">${apiVerifyUrl}</a></p>`,
      `<p>If that doesn't work open: <a href="${webVerifyUrl}">${webVerifyUrl}</a></p>`
    ].join("\n");

    await Mailer.sendMail({
      to: user.email,
      subject: "Verify your email",
      html
    });

    return token;
  },

  //--------------------------------------------------
  // Verify token (lookup by hashed token + type)
  //--------------------------------------------------
  async verifyEmailToken(plainToken) {
    if (!plainToken) throw new Error("Token is required");
    const tokenHash = sha256(String(plainToken));

    // look up by tokenHash and type 'verify'
    const record = await prisma.emailToken.findFirst({
      where: { tokenHash, type: "verify" }
    });

    if (!record) throw new Error("Invalid or expired token");
    if (record.expiresAt < new Date()) throw new Error("Token expired");

    const user = await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true }
    });

    await prisma.emailToken.delete({ where: { id: record.id } });

    return user;
  },

  //--------------------------------------------------
  // Password reset helpers (similar pattern)
  //--------------------------------------------------
  async sendPasswordResetEmail(email, origin) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = await this._createToken(user.id, "reset");
    const base = (origin || process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${base}/api/auth/email/reset-password?token=${token}`;

    await Mailer.sendMail({
      to: user.email,
      subject: "Password reset",
      html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`
    });

    return token;
  },

  async resetPassword(token, newPassword) {
    if (!token) throw new Error("Token is required");
    const tokenHash = sha256(String(token));

    const record = await prisma.emailToken.findFirst({ where: { tokenHash, type: "reset" } });
    if (!record) throw new Error("Invalid or expired token");
    if (record.expiresAt < new Date()) throw new Error("Token expired");

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash }
    });

    await prisma.emailToken.delete({ where: { id: record.id } });

    return true;
  }
};

module.exports = EmailTokenService;
