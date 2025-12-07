// src/modules/auth/services/impersonation.service.js

const prisma = require("../../../../prisma/index");
const TokenService = require("./token.service");
const AuditService = require("./audit.service");
const Webhook = require("./webhook.service"); // FIXED path (no ../services inside services folder)

const IMPERSONATION_TTL_MINUTES = parseInt(
  process.env.IMPERSONATION_TTL_MINUTES || "60",
  10
);

const ImpersonationService = {
  ////////////////////////////////////////////////////////////
  // START IMPERSONATION
  ////////////////////////////////////////////////////////////
  async startImpersonation({ adminUser, targetUserId, ip, userAgent, reason }) {
    console.log("🔥 ImpersonationService.startImpersonation() called");

    const adminUserId = adminUser.id;

    // Load target
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { roles: { include: { role: true } } },
    });
    if (!targetUser) throw new Error("Target user not found");

    // Permission rules
    const { canImpersonate } = require("../policies/impersonation-rules");
    if (
      !canImpersonate(
        adminUser.roles || [],
        targetUser.roles.map((r) => r.role.name)
      )
    ) {
      throw new Error("You are not allowed to impersonate this account");
    }

    // Create tokens
    const accessToken = TokenService.signAccessToken({
      userId: targetUserId,
      impersonatorId: adminUserId,
    });

    const refreshToken = TokenService.signRefreshToken({
      userId: targetUserId,
      impersonatorId: adminUserId,
    });

    const expiresAt = new Date(
      Date.now() + IMPERSONATION_TTL_MINUTES * 60 * 1000
    );

    const session = await prisma.session.create({
      data: {
        userId: targetUserId,
        token: refreshToken,
        userAgent: userAgent || null,
        ip: ip || null,
        expiresAt,
        isImpersonation: true,
        impersonatorId: adminUserId,
        impersonationReason: reason || null,
      },
    });

    // Audit log
    await AuditService.safeLog({
      userId: adminUserId,
      action: "impersonation.start",
      entity: "User",
      entityId: targetUserId,
      ip,
      userAgent,
      data: { reason },
    });

    // Webhook
    try {
      await Webhook.emit("auth.impersonation.start", {
        adminUserId,
        targetUserId,
        reason,
        ip,
        userAgent,
      });
    } catch (err) {
      console.warn("Webhook start error:", err.message);
    }

    return { accessToken, refreshToken, session, targetUser };
  },

  ////////////////////////////////////////////////////////////
  // STOP IMPERSONATION
  ////////////////////////////////////////////////////////////
  async stopImpersonation({ adminUserId, sessionId }) {
    console.log("🔥 stopImpersonation()", sessionId);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new Error("Session not found");
    if (!session.isImpersonation) throw new Error("Not an impersonation session");
    if (session.impersonatorId !== adminUserId)
      throw new Error("You cannot stop another admin’s impersonation session");

    await prisma.session.delete({ where: { id: sessionId } });

    await AuditService.safeLog({
      userId: adminUserId,
      action: "impersonation.stop",
      entity: "Session",
      entityId: sessionId,
    });

    try {
      await Webhook.emit("auth.impersonation.stop", {
        adminUserId,
        sessionId,
        targetUserId: session.userId,
      });
    } catch (err) {
      console.warn("Webhook stop error:", err.message);
    }

    return true;
  },

  ////////////////////////////////////////////////////////////
  // LIST SESSIONS
  ////////////////////////////////////////////////////////////
  async listImpersonationsByAdmin(adminUserId) {
    return prisma.session.findMany({
      where: {
        impersonatorId: adminUserId,
        isImpersonation: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },
};

module.exports = ImpersonationService;
