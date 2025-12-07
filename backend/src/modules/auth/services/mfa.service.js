const { authenticator } = require("otplib");
const QRCode = require("qrcode");
const bcrypt = require("bcrypt");
const prisma = require("../../../../prisma/index");
const TokenService = require("./token.service");

const SALT_ROUNDS = 12;

const MFAService = {
  ////////////////////////////////////////////////////////
  // Generate MFA secret + QR
  ////////////////////////////////////////////////////////
  async generateSetup(user) {
    const secret = authenticator.generateSecret();

    const otpauth = authenticator.keyuri(user.email, "YourCompanyName", secret);

    const qrImage = await QRCode.toDataURL(otpauth);

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret }
    });

    return {
      secret,
      otpauth,
      qrImage
    };
  },

  ////////////////////////////////////////////////////////
  // Verify TOTP code (enable MFA)
  ////////////////////////////////////////////////////////
  async verifyTOTP(userId, code) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.mfaSecret) {
      throw new Error("MFA not set up");
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.mfaSecret
    });

    if (!isValid) throw new Error("Invalid MFA code");

    // If valid, enable MFA
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true }
    });

    return true;
  },

  ////////////////////////////////////////////////////////
  // Disable MFA
  ////////////////////////////////////////////////////////
  async disable(userId, code) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.mfaEnabled) throw new Error("MFA not enabled");

    // Must validate the current code
    const isValid = authenticator.verify({
      token: code,
      secret: user.mfaSecret
    });

    if (!isValid) throw new Error("Invalid MFA code");

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: []
      }
    });

    return true;
  },

  ////////////////////////////////////////////////////////
  // Generate backup codes
  ////////////////////////////////////////////////////////
  async generateBackupCodes(userId) {
    const codes = [];

    for (let i = 0; i < 6; i++) {
      const raw = Math.random().toString(36).slice(-10);
      const hash = await bcrypt.hash(raw, SALT_ROUNDS);
      codes.push({ raw, hash });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaBackupCodes: codes.map(c => c.hash)
      }
    });

    return codes.map(c => c.raw); // return unhashed to the user ONCE
  },

  ////////////////////////////////////////////////////////
  // Verify via backup code (checks only)
  ////////////////////////////////////////////////////////
  async verifyBackupCode(userId, rawCode) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.mfaBackupCodes || user.mfaBackupCodes.length === 0) return false;

    for (const hash of user.mfaBackupCodes) {
      if (await bcrypt.compare(rawCode, hash)) return true;
    }

    return false;
  },

  ////////////////////////////////////////////////////////
  // Verify login MFA (TOTP or backup) and issue tokens
  ////////////////////////////////////////////////////////
  async verifyLogin({ userId, code, ip, userAgent }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        },
        clientProfile: true,
        adminProfile: true,
        resellerProfile: true,
        developerProfile: true
      }
    });

    if (!user) throw new Error("User not found");
    if (!user.mfaEnabled || !user.mfaSecret) throw new Error("MFA not enabled");

    // 1) Try TOTP
    const isTotpValid = authenticator.verify({
      token: code,
      secret: user.mfaSecret
    });

    // 2) Try backup codes if TOTP fails
    let usedBackupIndex = -1;
    let isBackupValid = false;

    if (!isTotpValid && Array.isArray(user.mfaBackupCodes) && user.mfaBackupCodes.length > 0) {
      for (let i = 0; i < user.mfaBackupCodes.length; i++) {
        const hash = user.mfaBackupCodes[i];
        if (await bcrypt.compare(code, hash)) {
          isBackupValid = true;
          usedBackupIndex = i;
          break;
        }
      }
    }

    if (!isTotpValid && !isBackupValid) {
      throw new Error("Invalid MFA code");
    }

    // If backup code used → remove it (one-time use) and persist
    if (isBackupValid && usedBackupIndex !== -1) {
      const newBackupCodes = user.mfaBackupCodes.slice();
      newBackupCodes.splice(usedBackupIndex, 1); // remove used code
      await prisma.user.update({
        where: { id: userId },
        data: { mfaBackupCodes: newBackupCodes }
      });
    }

    // Issue tokens
    const accessToken = TokenService.signAccessToken({ userId });
    const refreshToken = TokenService.signRefreshToken({ userId });

    // Store session
    await prisma.session.create({
      data: {
        userId,
        token: refreshToken,
        userAgent,
        ip,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days
      }
    });

    // Normalize roles + permissions
    const roles = (user.roles || []).map(ur => ur.role?.name).filter(Boolean);
    const permissions = [];
    (user.roles || []).forEach(ur => {
      ur.role?.permissions?.forEach(rp => {
        if (rp.permission?.key) permissions.push(rp.permission.key);
      });
    });
    const uniquePermissions = Array.from(new Set(permissions));

    // Determine portals
    const portals = [];
    if (roles.some(r => ["superadmin", "admin", "staff"].includes(r))) portals.push("admin");
    if (roles.includes("client")) portals.push("client");
    if (roles.includes("reseller")) portals.push("reseller");
    if (roles.includes("developer")) portals.push("developer");

    // Portal profiles
    const profile = {};
    if (portals.includes("client")) profile.client = user.clientProfile || null;
    if (portals.includes("admin")) profile.admin = user.adminProfile || null;
    if (portals.includes("reseller")) profile.reseller = user.resellerProfile || null;
    if (portals.includes("developer")) profile.developer = user.developerProfile || null;

    // Primary role
    const priority = ["superadmin", "admin", "reseller", "developer", "client", "staff"];
    const primaryRole = roles.slice().sort((a, b) => {
      const ia = priority.indexOf(a) === -1 ? priority.length : priority.indexOf(a);
      const ib = priority.indexOf(b) === -1 ? priority.length : priority.indexOf(b);
      return ia - ib;
    })[0] || null;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles,
        primaryRole,
        permissions: uniquePermissions,
        portals,
        profile
      }
    };
  }
};

module.exports = MFAService;
