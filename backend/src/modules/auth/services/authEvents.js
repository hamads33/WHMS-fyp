const WebhookEmitter = require("./simpleWebhookEmitter");

module.exports = {
  loginSuccess(user, meta = {}) {
    return WebhookEmitter.emit("auth.login.success", {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      ...meta,
    });
  },

  loginFailed(email, reason) {
    return WebhookEmitter.emit("auth.login.failed", {
      email,
      reason,
    });
  },

  logout(userId) {
    return WebhookEmitter.emit("auth.logout", {
      userId,
    });
  },

  sessionRevoked(userId, sessionId) {
    return WebhookEmitter.emit("auth.session.revoked", {
      userId,
      sessionId,
    });
  },

  revokeOtherSessions(userId) {
    return WebhookEmitter.emit("auth.session.revoked_all", {
      userId,
    });
  },

  impersonationStart(adminId, targetUserId, reason) {
    return WebhookEmitter.emit("auth.impersonation.start", {
      adminId,
      targetUserId,
      reason,
    });
  },

  impersonationStop(adminId, targetUserId) {
    return WebhookEmitter.emit("auth.impersonation.stop", {
      adminId,
      targetUserId,
    });
  },
};
