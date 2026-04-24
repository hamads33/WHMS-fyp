// lib/api/admin.js
import api from "./client";

/**
 * Complete Admin API Client
 * User management, roles, permissions, IP rules, audit logs, webhooks
 */
export const AdminAPI = {
  // ===================================
  // USER MANAGEMENT
  // ===================================
  
  /**
   * List all users with pagination and filters
   */
  async listUsers(params = {}) {
    const response = await api.get("/admin/users", { params });
    return response.data;
  },

  /**
   * Get single user by ID
   */
  async getUser(userId) {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Create new user
   */
  async createUser(data) {
    const response = await api.post("/admin/users", data);
    return response.data;
  },

  /**
   * Update user
   */
  async updateUser(userId, data) {
    const response = await api.patch(`/admin/users/${userId}`, data);
    return response.data;
  },

  /**
   * Delete user
   */
  async deleteUser(userId) {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Update user roles
   */
  async updateUserRoles(userId, roles) {
    const response = await api.post(`/admin/users/${userId}/roles`, { roles });
    return response.data;
  },

  /**
   * Update user permissions
   */
  async updateUserPermissions(userId, permissions) {
    const response = await api.post(`/admin/users/${userId}/permissions`, {
      permissions,
    });
    return response.data;
  },

  /**
   * Deactivate user account
   */
  async deactivateUser(userId, reason) {
    const response = await api.post(`/admin/users/${userId}/deactivate`, {
      reason,
    });
    return response.data;
  },

  /**
   * Activate user account
   */
  async activateUser(userId) {
    const response = await api.post(`/admin/users/${userId}/activate`);
    return response.data;
  },

  /**
   * Force logout user (revoke all sessions)
   */
  async forceLogoutUser(userId) {
    const response = await api.post(`/admin/users/${userId}/logout`);
    return response.data;
  },

  /**
   * Impersonate user
   */
  async impersonateUser(userId, reason) {
    const response = await api.post(`/admin/users/${userId}/impersonate`, {
      reason,
    });
    return response.data;
  },

  /**
   * Get user sessions
   */
  async getUserSessions(userId) {
    const response = await api.get(`/admin/users/${userId}/sessions`);
    return response.data;
  },

  /**
   * Get user activity logs
   */
  async getUserActivity(userId, params = {}) {
    const response = await api.get(`/admin/users/${userId}/activity`, {
      params,
    });
    return response.data;
  },

  // ===================================
  // ROLES & PERMISSIONS
  // ===================================
  
  /**
   * List all roles
   */
  async listRoles() {
    const response = await api.get("/admin/roles");
    return response.data;
  },

  /**
   * Get single role
   */
  async getRole(roleId) {
    const response = await api.get(`/admin/roles/${roleId}`);
    return response.data;
  },

  /**
   * Create new role
   */
  async createRole(data) {
    const response = await api.post("/admin/roles", data);
    return response.data;
  },

  /**
   * Update role
   */
  async updateRole(roleId, data) {
    const response = await api.patch(`/admin/roles/${roleId}`, data);
    return response.data;
  },

  /**
   * Delete role
   */
  async deleteRole(roleId) {
    const response = await api.delete(`/admin/roles/${roleId}`);
    return response.data;
  },

  /**
   * List all permissions
   */
  async listPermissions() {
    const response = await api.get("/admin/permissions");
    return response.data;
  },

  /**
   * Assign permissions to role
   */
  async assignPermissionsToRole(roleId, permissionIds) {
    const response = await api.post(`/admin/roles/${roleId}/permissions`, {
      permissionIds,
    });
    return response.data;
  },

  /**
   * Remove permissions from role
   */
  async removePermissionsFromRole(roleId, permissionIds) {
    const response = await api.delete(`/admin/roles/${roleId}/permissions`, {
      data: { permissionIds },
    });
    return response.data;
  },

  /**
   * Get role policies
   */
  async getRolePolicies() {
    const response = await api.get("/admin/role-policies");
    return response.data;
  },

  // ===================================
  // IP ACCESS RULES
  // ===================================
  
  /**
   * List IP rules
   */
  async listIpRules() {
    const response = await api.get("/ip-rules");
    return response.data;
  },

  /**
   * Create IP rule
   */
  async createIpRule(data) {
    const response = await api.post("/ip-rules", data);
    return response.data;
  },

  /**
   * Update IP rule
   */
  async updateIpRule(ruleId, data) {
    const response = await api.patch(`/ip-rules/${ruleId}`, data);
    return response.data;
  },

  /**
   * Delete IP rule
   */
  async deleteIpRule(ruleId) {
    const response = await api.delete(`/ip-rules/${ruleId}`);
    return response.data;
  },

  /**
   * Test IP against rules
   */
  async testIpRule(ip) {
    const response = await api.post("/ip-rules/test", { ip });
    return response.data;
  },

  // ===================================
  // AUDIT LOGS
  // ===================================
  
  /**
   * Get audit logs
   */
  async getAuditLogs(params = {}) {
    const response = await api.get("/admin/audit-logs", { params });
    return response.data;
  },

  /**
   * Get specific audit log
   */
  async getAuditLog(logId) {
    const response = await api.get(`/admin/audit-logs/${logId}`);
    return response.data;
  },

  /**
   * Export audit logs
   */
  async exportAuditLogs(params = {}) {
    const response = await api.get("/admin/audit-logs/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * Get impersonation logs
   */
  async getImpersonationLogs(params = {}) {
    const response = await api.get("/admin/impersonation/logs", { params });
    return response.data;
  },

  // ===================================
  // WEBHOOKS
  // ===================================

  /**
   * List webhooks
   */
  async listWebhooks() {
    const response = await api.get("/admin/webhooks");
    return response.data;
  },

  /**
   * Create webhook
   */
  async createWebhook(data) {
    const response = await api.post("/admin/webhooks", data);
    return response.data;
  },

  /**
   * Update webhook
   */
  async updateWebhook(webhookId, data) {
    const response = await api.patch(`/admin/webhooks/${webhookId}`, data);
    return response.data;
  },

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    const response = await api.delete(`/admin/webhooks/${webhookId}`);
    return response.data;
  },

  /**
   * Test webhook
   */
  async testWebhook(webhookId) {
    const response = await api.post(`/admin/webhooks/${webhookId}/test`);
    return response.data;
  },

  /**
   * Get webhook logs
   */
  async getWebhookLogs(webhookId, params = {}) {
    const response = await api.get(`/admin/webhooks/${webhookId}/logs`, {
      params,
    });
    return response.data;
  },

  // ===================================
  // SYSTEM SETTINGS
  // ===================================

  /**
   * Get system settings
   */
  async getSettings() {
    const response = await api.get("/admin/settings");
    return response.data;
  },

  /**
   * Update system settings
   */
  async updateSettings(data) {
    const response = await api.patch("/admin/settings", data);
    return response.data;
  },

  /**
   * Get system stats
   */
  async getSystemStats() {
    const response = await api.get("/admin/stats");
    return response.data;
  },

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics() {
    const response = await api.get("/admin/dashboard/metrics");
    return response.data;
  },

  // ===================================
  // EMAIL MANAGEMENT
  // ===================================

  /**
   * Send test email
   */
  async sendTestEmail(email) {
    const response = await api.post("/admin/email/test", { email });
    return response.data;
  },

  /**
   * Get email templates
   */
  async getEmailTemplates() {
    const response = await api.get("/admin/email/templates");
    return response.data;
  },

  /**
   * Update email template
   */
  async updateEmailTemplate(templateId, data) {
    const response = await api.patch(`/admin/email/templates/${templateId}`, data);
    return response.data;
  },
};

export default AdminAPI;