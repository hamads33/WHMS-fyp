// lib/api/auth.js
import { apiFetch } from "./client";

/**
 * Complete Auth API Client
 * ✅ Matches ALL backend routes exactly
 * ✅ Fixed resend verification email endpoint
 */
export const AuthAPI = {
  // ===================================
  // AUTHENTICATION
  // ===================================
  
  async register(data) {
    return await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async registerDeveloper(data) {
    return await apiFetch("/auth/register/developer", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async login(email, password) {
    return await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async logout() {
    return await apiFetch("/auth/logout", {
      method: "POST",
    });
  },

  async refresh() {
    return await apiFetch("/auth/refresh", {
      method: "POST",
    });
  },

  async me() {
    return await apiFetch("/auth/me");
  },

  // ===================================
  // SESSION MANAGEMENT
  // ===================================
  
  async getSession() {
    return await apiFetch("/auth/sessions/current");
  },

  async listSessions() {
    return await apiFetch("/auth/sessions");
  },

  async revokeSession(sessionId) {
    return await apiFetch(`/auth/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },

  async revokeOtherSessions() {
    return await apiFetch("/auth/sessions/others/all", {
      method: "DELETE",
    });
  },

  async getSecurityLogs() {
    return await apiFetch("/auth/sessions/security/logs");
  },
  
  // ===================================
  // EMAIL VERIFICATION
  // ✅ FIXED: Correct endpoints
  // ===================================
  
  async sendVerificationEmail(email, origin) {
    return await apiFetch("/auth/email/send-verification", {
      method: "POST",
      body: JSON.stringify({ email, origin }),
    });
  },

  async verifyEmail(token) {
    return await apiFetch(`/auth/email/verify?token=${token}`);
  },

  // ✅ FIXED: Use correct endpoint
  async resendVerificationEmail(email, origin) {
    return await apiFetch("/auth/email/send-verification", {
      method: "POST",
      body: JSON.stringify({ email, origin }),
    });
  },

  // ===================================
  // PASSWORD MANAGEMENT
  // ===================================

  async requestPasswordReset(email, origin) {
    return await apiFetch("/auth/password/request-reset", {
      method: "POST",
      body: JSON.stringify({ email, origin }),
    });
  },

  async resetPassword(token, newPassword) {
    return await apiFetch("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, password: newPassword }),
    });
  },

  // ===================================
  // MFA (Multi-Factor Authentication)
  // ===================================
  
  async setupMFA() {
    return await apiFetch("/auth/mfa/setup", {
      method: "POST",
    });
  },

  async verifyMFA(code) {
    return await apiFetch("/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  async disableMFA(code) {
    return await apiFetch("/auth/mfa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  async generateBackupCodes() {
    return await apiFetch("/auth/mfa/backup-codes", {
      method: "POST",
    });
  },

  async verifyMFALogin(userId, code) {
    return await apiFetch("/auth/mfa/verify-login", {
      method: "POST",
      body: JSON.stringify({ userId, code }),
    });
  },

  // ===================================
  // API KEYS
  // ===================================
  
  async createApiKey(name, scopes, expiresInDays) {
    return await apiFetch("/auth/apikeys", {
      method: "POST",
      body: JSON.stringify({ name, scopes, expiresInDays }),
    });
  },

  async listApiKeys() {
    return await apiFetch("/auth/apikeys");
  },

  async revokeApiKey(keyId) {
    return await apiFetch(`/auth/apikeys/${keyId}`, {
      method: "DELETE",
    });
  },

  // ===================================
  // TRUSTED DEVICES
  // ===================================
  
  async createTrustedDevice(name) {
    return await apiFetch("/auth/trusted-devices", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async listTrustedDevices() {
    return await apiFetch("/auth/trusted-devices");
  },

  async revokeTrustedDevice(deviceId) {
    return await apiFetch(`/auth/trusted-devices/${deviceId}`, {
      method: "DELETE",
    });
  },

  async revokeAllTrustedDevices() {
    return await apiFetch("/auth/trusted-devices", {
      method: "DELETE",
    });
  },

  // ===================================
  // ADMIN USER MANAGEMENT
  // ===================================
  
  async listUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(`/admin/users${query ? `?${query}` : ""}`);
  },

  async getUser(userId) {
    return await apiFetch(`/admin/users/${userId}`);
  },

  async updateUserRoles(userId, roles) {
    return await apiFetch(`/admin/users/${userId}/roles`, {
      method: "POST",
      body: JSON.stringify({ roles }),
    });
  },

  async deactivateUser(userId) {
    return await apiFetch(`/admin/users/${userId}/deactivate`, {
      method: "POST",
    });
  },

  async forceUserLogout(userId) {
    return await apiFetch(`/admin/users/${userId}/logout`, {
      method: "POST",
    });
  },

  async impersonateUser(userId, reason) {
    return await apiFetch(`/admin/users/${userId}/impersonate`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async adminForcePasswordReset(userId) {
    return await apiFetch(`/admin/users/${userId}/reset-password`, {
      method: "POST",
    });
  },


};

export default AuthAPI;