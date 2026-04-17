import { apiFetch } from "./client";

export const LogsAPI = {
  // GET /api/audit/logs
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null))
    ).toString();
    return apiFetch(`/audit/logs${query ? `?${query}` : ""}`);
  },

  // GET /api/audit/stats
  async getStats() {
    return apiFetch("/audit/stats");
  },

  // GET /api/audit/sources
  async getSources() {
    return apiFetch("/audit/sources");
  },

  // GET /api/admin/impersonation/logs
  async getImpersonationLogs(params = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null))
    ).toString();
    return apiFetch(`/admin/impersonation/logs${query ? `?${query}` : ""}`);
  },
};
