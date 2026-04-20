import { apiFetch } from "./client";

const BASE = "/admin/provisioning";

export const ProvisioningAPI = {
  // ── Accounts ──────────────────────────────────────────────────
  listAccounts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`${BASE}/accounts${q ? `?${q}` : ""}`);
  },

  getAccount: (username) => apiFetch(`${BASE}/accounts/${username}`),

  // ── Provision / Deprovision ───────────────────────────────────
  provisionAsync: (orderId) =>
    apiFetch(`${BASE}/orders/${orderId}/provision-async`, { method: "POST" }),

  deprovisionAsync: (orderId) =>
    apiFetch(`${BASE}/orders/${orderId}/deprovision-async`, { method: "POST" }),

  // ── Suspend / Unsuspend ───────────────────────────────────────
  suspendAsync: (orderId, reason = "admin-action") =>
    apiFetch(`${BASE}/orders/${orderId}/suspend-async`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  unsuspendAsync: (orderId) =>
    apiFetch(`${BASE}/orders/${orderId}/unsuspend-async`, { method: "POST" }),

  suspendDirect: (username, reason = "admin-action") =>
    apiFetch(`${BASE}/accounts/${username}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  unsuspendDirect: (username) =>
    apiFetch(`${BASE}/accounts/${username}/unsuspend`, { method: "POST" }),

  // ── Domains ───────────────────────────────────────────────────
  provisionDomainAsync: (username, domain, opts = {}) =>
    apiFetch(`${BASE}/accounts/${username}/domains-async`, {
      method: "POST",
      body: JSON.stringify({ domain, ...opts }),
    }),

  // ── SSL ───────────────────────────────────────────────────────
  issueSSL: (username, domain) =>
    apiFetch(`${BASE}/accounts/${username}/ssl`, {
      method: "POST",
      body: JSON.stringify({ domain }),
    }),

  // ── Database ──────────────────────────────────────────────────
  createDatabase: (username, domain, dbData) =>
    apiFetch(`${BASE}/accounts/${username}/databases-async`, {
      method: "POST",
      body: JSON.stringify({ domain, ...dbData }),
    }),

  // ── Email ─────────────────────────────────────────────────────
  createEmail: (username, domain, emailData) =>
    apiFetch(`${BASE}/accounts/${username}/emails-async`, {
      method: "POST",
      body: JSON.stringify({ domain, ...emailData }),
    }),

  // ── Stats / Sync ──────────────────────────────────────────────
  syncAccount: (username) =>
    apiFetch(`${BASE}/accounts/${username}/sync`, { method: "POST" }),

  syncAll: () => apiFetch(`${BASE}/sync-all`, { method: "POST" }),

  // ── Job status ────────────────────────────────────────────────
  getJobStatus: (jobId) => apiFetch(`${BASE}/jobs/${jobId}`),

  // ── Connection test ───────────────────────────────────────────
  testConnection: () => apiFetch(`${BASE}/test-connection`),
};
