// src/modules/auth/services/auth.service.js
const prisma = require("../../../../prisma/index");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const TokenService = require("./token.service");
const RolePolicyService = require("./rolePolicy.service");
const AuditService = require("./audit.service");
const { resolveCountry } = require("../utils/geoip");
const { hashDevice } = require("../utils/deviceFingerprint");

// Mailer (safe fallback with correct path)
let Mailer;

try {
  Mailer = require("../utils/mailer");
} catch (e1) {
  try {
    Mailer = require("../../../utils/mailer");
  } catch (e2) {
    Mailer = {
      sendMail: async () => {
        console.warn("📨 Fallback Mailer used – email dropped (OK in dev)");
      }
    };
  }
}

// Webhook emitter – try a few relative paths then fallback to noop
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
      Webhook = { emit: async () => {} };
    }
  }
}

const SALT_ROUNDS = 12;
const EMAIL_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

const AuthService = {
  ////////////////////////////////////////////////////////
  // REGISTER – Create user + assign default client role
  ////////////////////////////////////////////////////////
  async register({ email, password }) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new Error("Email already registered");

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    const clientRole = await prisma.role.findUnique({ where: { name: "client" } });
    if (clientRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: clientRole.id,
        },
      });
    }

    await prisma.clientProfile.create({ data: { userId: user.id } }).catch(() => {});

    try {
      await Webhook.emit("auth.register", { userId: user.id, email: user.email });
    } catch (err) {
      console.warn("Webhook emit (auth.register) failed:", err?.message || err);
    }

    return {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
    };
  },

  async findUserById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findUserByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },

  ////////////////////////////////////////////////////////
  // EMAIL VERIFICATION HELPERS
  ////////////////////////////////////////////////////////
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

  async sendVerificationEmail(userId, { origin } = {}) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const { token } = await this.createEmailVerificationToken(userId);

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

    try {
      await Webhook.emit("auth.email.verify.sent", { userId: user.id, email: user.email, verifyUrl });
    } catch (err) {
      console.warn("Webhook emit (auth.email.verify.sent) failed:", err?.message || err);
    }

    return { success: true, verifyUrl };
  },

  async verifyEmailToken(token) {
    if (!token) throw new Error("Token is required");

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

    const user = await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });

    await prisma.emailToken.deleteMany({
      where: {
        userId: record.userId,
        purpose: "email_verification",
      },
    });

    await AuditService.log({
      userId: record.userId,
      action: "user.email_verified",
      entity: "auth",
      entityId: record.userId,
      data: { byToken: true },
      ip: null,
      userAgent: null,
    });

    try {
      await Webhook.emit("auth.email.verified", { userId: user.id, email: user.email });
    } catch (err) {
      console.warn("Webhook emit (auth.email.verified) failed:", err?.message || err);
    }

    return { success: true, userId: record.userId };
  },

  ////////////////////////////////////////////////////////
  // LOGIN – Multi-role + MFA-aware + RolePolicy enforcement
  ////////////////////////////////////////////////////////
  async login({ email, password, ip, userAgent }) {
  // ------------------------------------------------------
  // 0) Normalize request context (CRITICAL)
  // ------------------------------------------------------
  const normalizedIp = ip || null;
  const normalizedUserAgent = userAgent || null;

  // ------------------------------------------------------
  // 1) Load user with roles & profiles
  // ------------------------------------------------------
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
    await this.logLoginAttempt(
      null,
      email,
      false,
      normalizedIp,
      normalizedUserAgent,
      "user_not_found"
    );

    try {
      await Webhook.emit("auth.login.failure", {
        email,
        reason: "user_not_found",
        ip: normalizedIp,
        userAgent: normalizedUserAgent,
      });
    } catch {}

    throw new Error("Invalid email or password");
  }

  // ------------------------------------------------------
  // 2) Verify password
  // ------------------------------------------------------
  const isValidPassword = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isValidPassword) {
    await this.logLoginAttempt(
      user.id,
      email,
      false,
      normalizedIp,
      normalizedUserAgent,
      "invalid_password"
    );

    try {
      await Webhook.emit("auth.login.failure", {
        userId: user.id,
        email,
        reason: "invalid_password",
        ip: normalizedIp,
        userAgent: normalizedUserAgent,
      });
    } catch {}

    throw new Error("Invalid email or password");
  }

  // ------------------------------------------------------
  // 2.5) MFA gate — password is valid but MFA is required
  // Do NOT issue tokens or create a session yet.
  // The client must complete /auth/mfa/verify-login first.
  // ------------------------------------------------------
  if (user.mfaEnabled) {
    return { requiresMFA: true, userId: user.id };
  }

  // ------------------------------------------------------
  // 3) Reload fresh flags (emailVerified, disabled, etc.)
  // ------------------------------------------------------
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true },
  });

  user.emailVerified = Boolean(fresh?.emailVerified);

  // ------------------------------------------------------
  // 4) Ensure portal profiles (self-healing)
  // ------------------------------------------------------
  await Promise.all(this._ensurePortalProfiles(user));

  // ------------------------------------------------------
  // 5) Generate tokens
  // ------------------------------------------------------
  const accessToken = TokenService.signAccessToken({
    userId: user.id,
  });

  const refreshToken = TokenService.signRefreshToken({
    userId: user.id,
  });

  // ------------------------------------------------------
  // 6) Device fingerprint + Geo-IP (SAFE & PRIVACY-AWARE)
  // ------------------------------------------------------
  const country = resolveCountry(normalizedIp);

  const deviceHash = hashDevice({
    userAgent: normalizedUserAgent,
    ip: normalizedIp,
  });

  // ------------------------------------------------------
  // 7) Detect new device
  // ------------------------------------------------------
  let isNewDevice = false;

  if (deviceHash) {
    const knownDevice = await prisma.session.findFirst({
      where: {
        userId: user.id,
        deviceHash,
      },
      select: { id: true },
    });

    isNewDevice = !knownDevice;
  }

  // ------------------------------------------------------
  // 8) Remove existing session for SAME DEVICE only
  // (prevents duplicates without killing other sessions)
  // ------------------------------------------------------
  if (deviceHash) {
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        deviceHash,
      },
    });
  }

  // ------------------------------------------------------
  // 9) Create session (authoritative source of truth)
  // ------------------------------------------------------
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: accessToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
      ip: normalizedIp,
      userAgent: normalizedUserAgent,
      deviceHash,
      country,
      lastActivity: new Date(),
    },
  });
  console.log("[AUTH.SERVICE] Session created. ID:", session.id, "UserId:", session.userId);

  // ------------------------------------------------------
  // 10) Log success
  // ------------------------------------------------------
  await this.logLoginAttempt(
    user.id,
    email,
    true,
    normalizedIp,
    normalizedUserAgent,
    "login_success"
  );

  try {
    await Webhook.emit("auth.login.success", {
      userId: user.id,
      email: user.email,
      ip: normalizedIp,
      userAgent: normalizedUserAgent,
      country,
    });
  } catch {}

  // ------------------------------------------------------
  // 11) New device security alert (NON-BLOCKING)
  // ------------------------------------------------------
  if (isNewDevice) {
    await AuditService.log({
      userId: user.id,
      action: "security.new_device",
      entity: "session",
      entityId: user.id,
      data: {
        ip: normalizedIp,
        country,
        userAgent: normalizedUserAgent,
      },
      ip: normalizedIp,
      userAgent: normalizedUserAgent,
    });

    try {
      await Webhook.emit("security.new_device", {
        userId: user.id,
        email: user.email,
        ip: normalizedIp,
        country,
      });
    } catch {}
  }

  // ------------------------------------------------------
  // 12) Return response (unchanged contract)
  // ------------------------------------------------------
  return {
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      roles: (user.roles || [])
        .map((r) => r.role && r.role.name)
        .filter(Boolean),
    },
    accessToken,
    refreshToken,
  };
}
,

  ////////////////////////////////////////////////////////
  // REFRESH – Rotate refresh token
  // ✅ FIXED: Now accepts ip and userAgent + cleans up old sessions
  ////////////////////////////////////////////////////////
  async refresh({ refreshToken, ip, userAgent }) {
    // 1) Verify the refresh token JWT
    const payload = TokenService.verifyRefreshToken(refreshToken);
    if (!payload?.userId) throw new Error("Invalid refresh token");

    // 2) Load user and check if active
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.disabled) throw new Error("User not found or disabled");

    // 3) Generate new tokens
    const newAccessToken = TokenService.signAccessToken({ userId: user.id });
    const newRefreshToken = TokenService.signRefreshToken({ userId: user.id });

    // ✅ FIX: Delete any existing sessions for this user from this device/IP
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });

    // 4) ✅ Create session with ip and userAgent
    await prisma.session.create({
      data: {
        userId: user.id,
        token: newAccessToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        ip: ip || null,
        userAgent: userAgent || null,
        lastActivity: new Date(),
      },
    });

    try {
      await Webhook.emit("auth.refresh", { userId: user.id });
    } catch (err) {
      console.warn("Webhook emit (auth.refresh) failed:", err?.message || err);
    }

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  ////////////////////////////////////////////////////////
  // LOGOUT – Revoke refresh token(s)
  ////////////////////////////////////////////////////////
  async logout(refreshToken) {
    if (!refreshToken) return;
    const session = await prisma.session.findUnique({ where: { token: refreshToken } });
    const userId = session ? session.userId : null;
    await prisma.session.deleteMany({ where: { token: refreshToken } });

    try {
      await Webhook.emit("auth.logout", { userId });
    } catch (err) {
      console.warn("Webhook emit (auth.logout) failed:", err?.message || err);
    }

    return { success: true };
  },

  ////////////////////////////////////////////////////////
  // LOGIN LOGGING
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