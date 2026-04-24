// frontend/lib/api/users.js

import { apiFetch } from "./client";

export const UsersAPI = {
  /**
   * List all users with pagination and filters
   */
  async listUsers({ page = 1, limit = 20, q = "", role = "", status = "" } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (limit) params.set("limit", limit);
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (status) params.set("status", status);

    return apiFetch(`/admin/users?${params.toString()}`);
  },

  /**
   * Get single user details
   */
  async getUserById(id) {
    return apiFetch(`/admin/users/${id}`);
  },

  /**
   * Update user roles
   */
  async updateUserRoles(id, roles) {
    return apiFetch(`/admin/users/${id}/roles`, {
      method: "POST",  // ✅ Changed from PUT to POST to match your backend
      body: JSON.stringify({ roles }),
    });
  },

  /**
   * Deactivate user account
   */
  async deactivateUser(id, reason = "") {
    return apiFetch(`/admin/users/${id}/deactivate`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Activate user account
   */
  async activateUser(id) {
    return apiFetch(`/admin/users/${id}/activate`, {
      method: "POST",
    });
  },

  /**
   * Force logout user from all sessions
   */
  async forceLogout(id) {
    return apiFetch(`/admin/users/${id}/logout`, {  // ✅ Changed from /force-logout to /logout
      method: "POST",
    });
  },

  /**
   * Get user statistics
   */
  async getUserStats() {
    return apiFetch("/admin/users/stats");  // ✅ Uses /admin/users/stats
  },

  /**
   * List all available roles
   */
  async listRoles() {
    return apiFetch("/admin/users/roles");  // ✅ Changed from /admin/roles to /admin/users/roles
  },
};