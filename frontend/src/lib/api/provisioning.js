import { apiFetch } from "./client";

const ADMIN_BASE = "/admin/provisioning";
const CLIENT_BASE = "/client/provisioning";

export const ProvisioningAPI = {
  // ── Accounts ──────────────────────────────────────────────────
  listAccounts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`${ADMIN_BASE}/accounts${q ? `?${q}` : ""}`);
  },

  getAccount: (username) => apiFetch(`${ADMIN_BASE}/accounts/${username}`),

  // ── Provision / Deprovision ───────────────────────────────────
  provisionAsync: (orderId) =>
    apiFetch(`${ADMIN_BASE}/orders/${orderId}/provision-async`, { method: "POST" }),

  deprovisionAsync: (orderId) =>
    apiFetch(`${ADMIN_BASE}/orders/${orderId}/deprovision-async`, { method: "POST" }),

  // ── Suspend / Unsuspend ───────────────────────────────────────
  suspendAsync: (orderId, reason = "admin-action") =>
    apiFetch(`${ADMIN_BASE}/orders/${orderId}/suspend-async`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  unsuspendAsync: (orderId) =>
    apiFetch(`${ADMIN_BASE}/orders/${orderId}/unsuspend-async`, { method: "POST" }),

  suspendDirect: (username, reason = "admin-action") =>
    apiFetch(`${ADMIN_BASE}/accounts/${username}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  unsuspendDirect: (username) =>
    apiFetch(`${ADMIN_BASE}/accounts/${username}/unsuspend`, { method: "POST" }),

  // ── Domains ───────────────────────────────────────────────────
  provisionDomainAsync: (username, domain, opts = {}) =>
    apiFetch(`${ADMIN_BASE}/accounts/${username}/domains-async`, {
      method: "POST",
      body: JSON.stringify({ domain, ...opts }),
    }),

  // ── SSL ───────────────────────────────────────────────────────
  issueSSL: (username, domain) =>
    apiFetch(`${ADMIN_BASE}/accounts/${username}/ssl`, {
      method: "POST",
      body: JSON.stringify({ domain }),
    }),

  // ── Database ──────────────────────────────────────────────────
  createDatabase: (username, domain, dbData) =>
    apiFetch(`${ADMIN_BASE}/accounts/${username}/databases-async`, {
      method: "POST",
      body: JSON.stringify({ domain, ...dbData }),
    }),

  // ── Email ─────────────────────────────────────────────────────
  createEmail: (username, domain, emailData) =>
    apiFetch(`${ADMIN_BASE}/accounts/${username}/emails-async`, {
      method: "POST",
      body: JSON.stringify({ domain, ...emailData }),
    }),

  // ── Stats / Sync ──────────────────────────────────────────────
  syncAccount: (username) =>
    apiFetch(`${ADMIN_BASE}/accounts/${username}/sync`, { method: "POST" }),

  syncAll: () => apiFetch(`${ADMIN_BASE}/sync-all`, { method: "POST" }),

  // ── Job status ────────────────────────────────────────────────
  getJobStatus: (jobId) => apiFetch(`${ADMIN_BASE}/jobs/${jobId}`),

  // ── Connection test ───────────────────────────────────────────
  testConnection: () => apiFetch(`${ADMIN_BASE}/test-connection`),
};

export const ClientProvisioningAPI = {
  listAccounts: () => apiFetch(`${CLIENT_BASE}/accounts`),

  getAccount: (username) => apiFetch(`${CLIENT_BASE}/accounts/${username}`),

  getAccountByOrder: (orderId) => apiFetch(`${CLIENT_BASE}/accounts/order/${orderId}`),

  createDomain: (username, payload) =>
    apiFetch(`${CLIENT_BASE}/accounts/${username}/domains`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createEmail: (username, payload) =>
    apiFetch(`${CLIENT_BASE}/accounts/${username}/emails`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createDatabase: (username, payload) =>
    apiFetch(`${CLIENT_BASE}/accounts/${username}/databases`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  issueSSL: (username, domain) =>
    apiFetch(`${CLIENT_BASE}/accounts/${username}/ssl`, {
      method: "POST",
      body: JSON.stringify({ domain }),
    }),

  getStats: (username) => apiFetch(`${CLIENT_BASE}/accounts/${username}/stats`),

  syncAccount: (username) =>
    apiFetch(`${CLIENT_BASE}/accounts/${username}/sync`, { method: "POST" }),
};
