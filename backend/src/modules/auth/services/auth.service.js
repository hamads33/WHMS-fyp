// src/modules/auth/services/auth.service.js
const prisma = require("../../../../prisma/index");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const TokenService = require("./token.service");
const RolePolicyService = require("./rolePolicy.service");
const AuditService = require("./audit.service");

// Mailer (existing fallback pattern)
// Mailer (safe fallback with correct path)
let Mailer;

try {
  // Correct relative path from services → utils
  Mailer = require("../utils/mailer");
} catch (e1) {
  try {
    // Keep your old attempt in case other modules rely on it
    Mailer = require("../../../utils/mailer");
  } catch (e2) {
    Mailer = {
      sendMail: async () => {
        console.warn("📨 Fallback Mailer used — email dropped (OK in dev)");
      }
    };
  }
}


// Webhook emitter — try a few relative paths then fallback to noop
let Webhook = { emit: async () => {} };
try {
  Webhook = require("../../../module/services/webhook.service");
} catch (e1) {
  try {
    Webhook = require("../../module/services/webhook.service");
  } catch (e2) {
    try {
      Webhook = require("../../../../module/services/webhook.service");
    } catch (e3) {
      // keep noop emitter
      Webhook = { emit: async () => {} };
    }
  }
}

const SALT_ROUNDS = 12;

// Email token lifetime (ms). 24 hours.
const EMAIL_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

const AuthService = {
  ////////////////////////////////////////////////////////
  // REGISTER — Create user + assign default client role
  ////////////////////////////////////////////////////////
  async register({ email, password }) {
    // 1) prevent duplicate
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new Error("Email already registered");

    // 2) hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3) create user (emailVerified stays false by default)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    // 4) assign default role = client (if exists)
    const clientRole = await prisma.role.findUnique({ where: { name: "client" } });
    if (clientRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: clientRole.id,
        },
      });
    }

    // 5) create client profile idempotently
    await prisma.clientProfile.create({ data: { userId: user.id } }).catch(() => {});

    // emit webhook (register)
    try {
      await Webhook.emit("auth.register", { userId: user.id, email: user.email });
    } catch (err) {
      // swallowing webhook errors intentionally (non-blocking)
      console.warn("Webhook emit (auth.register) failed:", err?.message || err);
    }

    // 6) return minimal safe payload
    return {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
    };
  },

  // ---------------------------------------------------------------------
  // Basic User Fetch Helpers Needed by Controllers & Tests
  // ---------------------------------------------------------------------
  async findUserById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findUserByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },

  ////////////////////////////////////////////////////////
  // EMAIL VERIFICATION HELPERS
  ////////////////////////////////////////////////////////

  // Create and persist an email verification token (plaintext token stored).
  async createEmailVerificationToken(userId, ttlMs = EMAIL_TOKEN_TTL_MS) {
    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = new Date(Date.now() + ttlMs);

    await prisma.emailToken.create({
      data: {
        userId,
        token,
        purpose: "email_verification",
        expiresAt,
      },
    });

    return { token, expiresAt };
  },

  // Send verification email
  async sendVerificationEmail(userId, { origin } = {}) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const { token } = await this.createEmailVerificationToken(userId);

    // prefer origin param, fallback to env or localhost
    const base = origin || process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:3000";
    const verifyUrl = `${base.replace(/\/$/, "")}/api/auth/verify-email?token=${token}`;

    const subject = "Verify your email";
    const html = `
      <p>Hello,</p>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>If you did not request this, you can ignore this message.</p>
    `;
    const text = `Verify your email: ${verifyUrl}`;

    await Mailer.sendMail({ to: user.email, subject, text, html });

    // emit webhook (email.sent)
    try {
      await Webhook.emit("auth.email.verify.sent", { userId: user.id, email: user.email, verifyUrl });
    } catch (err) {
      console.warn("Webhook emit (auth.email.verify.sent) failed:", err?.message || err);
    }

    return { success: true, verifyUrl };
  },

  // Verify token, mark user.emailVerified true and delete token
  async verifyEmailToken(token) {
    if (!token) throw new Error("Token is required");

    // find token record
    const record = await prisma.emailToken.findFirst({
      where: {
        token,
        purpose: "email_verification",
      },
    });

    if (!record) throw new Error("Invalid or expired token");

    if (record.expiresAt < new Date()) {
      await prisma.emailToken.deleteMany({ where: { id: record.id } }).catch(() => {});
      throw new Error("Token expired");
    }

    // mark user verified
    const user = await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });

    // cleanup tokens
    await prisma.emailToken.deleteMany({
      where: {
        userId: record.userId,
        purpose: "email_verification",
      },
    });

    // create audit entry
    await AuditService.log({
      userId: record.userId,
      action: "user.email_verified",
      entity: "auth",
      entityId: record.userId,
      data: { byToken: true },
      ip: null,
      userAgent: null,
    });

    // emit webhook (email.verified)
    try {
      await Webhook.emit("auth.email.verified", { userId: user.id, email: user.email });
    } catch (err) {
      console.warn("Webhook emit (auth.email.verified) failed:", err?.message || err);
    }

    return { success: true, userId: record.userId };
  },

  ////////////////////////////////////////////////////////
  // LOGIN — Multi-role + MFA-aware + RolePolicy enforcement
  ////////////////////////////////////////////////////////
  async login({ email, password, ip, userAgent }) {
    // 1) load user with roles & profiles
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        clientProfile: true,
        adminProfile: true,
        resellerProfile: true,
        developerProfile: true,
      },
    });

    if (!user) {
      await this.logLoginAttempt(null, email, false, ip, userAgent, "user_not_found");
      // emit webhook (login failure)
      try {
        await Webhook.emit("auth.login.failure", { email, reason: "user_not_found", ip, userAgent });
      } catch (err) {
        console.warn("Webhook emit (auth.login.failure) failed:", err?.message || err);
      }
      throw new Error("Invalid email or password");
    }

    // 2) Verify Password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await this.logLoginAttempt(user.id, email, false, ip, userAgent, "invalid_password");
      try {
        await Webhook.emit("auth.login.failure", { userId: user.id, email, reason: "invalid_password", ip, userAgent });
      } catch (err) {
        console.warn("Webhook emit (auth.login.failure) failed:", err?.message || err);
      }
      throw new Error("Invalid email or password");
    }

    // 3) Reload minimal fresh record (for flags like emailVerified)
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    user.emailVerified = Boolean(fresh?.emailVerified);

    // 4) Ensure profiles exist based on roles (Self-healing)
    await Promise.all(this._ensurePortalProfiles(user));

    // 5) Generate Tokens
    const accessToken = TokenService.signAccessToken({ userId: user.id });
    const refreshToken = TokenService.signRefreshToken({ userId: user.id });

    // 6) Create Session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        ip,
        userAgent,
      },
    });

    // 7) Log Success
    await this.logLoginAttempt(user.id, email, true, ip, userAgent, "login_success");

    // emit webhook (login success)
    try {
      await Webhook.emit("auth.login.success", { userId: user.id, email: user.email, ip, userAgent });
    } catch (err) {
      console.warn("Webhook emit (auth.login.success) failed:", err?.message || err);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        roles: (user.roles || []).map((r) => r.role && r.role.name).filter(Boolean),
      },
      accessToken,
      refreshToken,
    };
  },

  ////////////////////////////////////////////////////////
  // REFRESH — Rotate refresh token
  ////////////////////////////////////////////////////////
  async refresh({ refreshToken }) {
    const payload = TokenService.verifyRefreshToken(refreshToken);
    if (!payload) throw new Error("Invalid refresh token");

    const session = await prisma.session.findUnique({ where: { token: refreshToken } });
    if (!session) throw new Error("Session expired or invalid");

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new Error("User not found");

    // rotate tokens
    await prisma.session.deleteMany({ where: { token: refreshToken } });

    const newRefresh = TokenService.signRefreshToken({ userId: user.id });
    const newAccess = TokenService.signAccessToken({ userId: user.id });

    await prisma.session.create({
      data: {
        userId: user.id,
        token: newRefresh,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    // emit webhook (refresh)
    try {
      await Webhook.emit("auth.refresh", { userId: user.id });
    } catch (err) {
      console.warn("Webhook emit (auth.refresh) failed:", err?.message || err);
    }

    return { accessToken: newAccess, refreshToken: newRefresh };
  },

  ////////////////////////////////////////////////////////
  // LOGOUT — Revoke refresh token(s)
  ////////////////////////////////////////////////////////
  async logout(refreshToken) {
    if (!refreshToken) return;
    // find session first for userId to include in webhook
    const session = await prisma.session.findUnique({ where: { token: refreshToken } });
    const userId = session ? session.userId : null;
    await prisma.session.deleteMany({ where: { token: refreshToken } });

    // emit webhook (logout)
    try {
      await Webhook.emit("auth.logout", { userId });
    } catch (err) {
      console.warn("Webhook emit (auth.logout) failed:", err?.message || err);
    }

    return { success: true };
  },

  ////////////////////////////////////////////////////////
  // LOGIN LOGGING (also writes to AuditLog via AuditService)
  ////////////////////////////////////////////////////////
  async logLoginAttempt(userId, email, success, ip, userAgent, reason) {
    await prisma.loginLog.create({
      data: {
        userId: userId || null,
        userEmail: email,
        success,
        ip,
        userAgent,
        reason,
      },
    });

    await AuditService.log({
      userId: userId || null,
      action: success ? "login.success" : "login.failure",
      entity: "auth",
      entityId: userId || null,
      data: { email, reason },
      ip,
      userAgent,
    });
  },

  ////////////////////////////////////////////////////////
  // AUTO PROFILE CREATION
  ////////////////////////////////////////////////////////
  _ensurePortalProfiles(user) {
    const tasks = [];
    const roleNames = (user.roles || []).map((ur) => ur.role?.name).filter(Boolean);

    if (["superadmin", "admin", "staff"].some((r) => roleNames.includes(r)) && !user.adminProfile) {
      tasks.push(
        prisma.adminProfile
          .create({
            data: {
              userId: user.id,
              department: "Unassigned",
              staffTitle: "Staff",
              restrictionJson: null,
            },
          })
          .catch(() => {})
      );
    }

    if (roleNames.includes("reseller") && !user.resellerProfile) {
      tasks.push(
        prisma.resellerProfile
          .create({
            data: {
              userId: user.id,
              resellerCode: `RS-${Date.now().toString(36)}-${Math.floor(Math.random() * 9000) + 1000}`,
            },
          })
          .catch(() => {})
      );
    }

    if (roleNames.includes("developer") && !user.developerProfile) {
      tasks.push(
        prisma.developerProfile
          .create({
            data: {
              userId: user.id,
              displayName: user.email.split("@")[0],
              payoutsEmail: user.email,
            },
          })
          .catch(() => {})
      );
    }

    if (roleNames.includes("client") && !user.clientProfile) {
      tasks.push(
        prisma.clientProfile
          .create({
            data: { userId: user.id },
          })
          .catch(() => {})
      );
    }

    return tasks;
  },
};

module.exports = AuthService;
