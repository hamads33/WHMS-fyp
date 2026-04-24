const prisma = require("../../../../prisma");
const crypto = require("crypto");
const Mailer = require("./email.service"); // test env resolves to mock
const bcrypt = require("bcrypt");

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

const EmailTokenService = {
  // --------------------------------------------------
  // Create token (store hash in DB)
  // --------------------------------------------------
  async _createToken(userId, type) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    await prisma.emailToken.create({
      data: { userId, tokenHash, type, expiresAt },
    });

    return token;
  },

  // --------------------------------------------------
  // Verification email
  // --------------------------------------------------
  async sendVerificationEmail(user, origin) {
    if (!user || !user.email) throw new Error("Invalid user");

    const token = await this._createToken(user.id, "verify");

    const base = (origin || process.env.FRONTEND_ORIGIN || "http://localhost:3000")
      .replace(/\/$/, "");

    // ✅ FIXED: Use frontend page URL, not API URL
    const verifyUrl = `${base}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #0066cc; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Welcome to WHMS!</h1>
            <p>Thank you for registering. Please verify your email address to activate your account.</p>
            <p>
              <a href="${verifyUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0066cc;">${verifyUrl}</p>
            <div class="footer">
              <p>This link will expire in 15 minutes.</p>
              <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await Mailer.sendMail({
      to: user.email,
      subject: "Verify Your Email - WHMS",
      html,
    });

    return token;
  },

  // --------------------------------------------------
  // Verify email token
  // --------------------------------------------------
  async verifyEmailToken(plainToken) {
    if (!plainToken) throw new Error("Token is required");

    const tokenHash = sha256(String(plainToken));

    const record = await prisma.emailToken.findFirst({
      where: { tokenHash, type: "verify" },
    });

    if (!record) throw new Error("Invalid or expired token");
    if (record.expiresAt < new Date()) throw new Error("Token expired");

    const user = await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });

    await prisma.emailToken.delete({ where: { id: record.id } });

    return user;
  },

  // --------------------------------------------------
  // Password reset
  // --------------------------------------------------
  async sendPasswordResetEmail(email, origin) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = await this._createToken(user.id, "reset");

    const base = (origin || process.env.FRONTEND_ORIGIN || "http://localhost:3000")
      .replace(/\/$/, "");

    // ✅ FIXED: Use frontend page URL, not API URL
    const resetUrl = `${base}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #0066cc; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Reset Your Password</h1>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0066cc;">${resetUrl}</p>
            <div class="footer">
              <p>This link will expire in 15 minutes.</p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await Mailer.sendMail({
      to: user.email,
      subject: "Password Reset - WHMS",
      html,
    });

    return token;
  },

  async resetPassword(token, newPassword) {
    if (!token) throw new Error("Token is required");

    const tokenHash = sha256(String(token));

    const record = await prisma.emailToken.findFirst({
      where: { tokenHash, type: "reset" },
    });

    if (!record) throw new Error("Invalid or expired token");
    if (record.expiresAt < new Date()) throw new Error("Token expired");

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await prisma.emailToken.delete({ where: { id: record.id } });

    return true;
  },
};

module.exports = EmailTokenService;