// lib/api/impersonation.js
import { apiFetch } from "./api/client";

/**
 * Impersonation API
 * Handles admin user impersonation functionality
 * 
 * NOTE: All paths do NOT include /api prefix as NEXT_PUBLIC_API_URL already includes it
 * 
 * @module ImpersonationAPI
 */

/**
 * Start impersonating a user
 * @param {Object} body - Request body
 * @param {string} body.targetUserId - ID of user to impersonate
 * @param {string} [body.reason] - Reason for impersonation (recommended)
 * @returns {Promise<Object>} Impersonation session details
 */
async function start(body) {
  return await apiFetch("/auth/impersonate/start", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Stop current impersonation session
 * @param {Object} [body={}] - Request body
 * @param {string} [body.sessionId] - Session ID to stop (optional)
 * @returns {Promise<Object>} Success response
 */
async function stop(body = {}) {
  return await apiFetch("/auth/impersonate/stop", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * List all active impersonation sessions
 * @returns {Promise<Array>} List of active sessions
 */
async function list() {
  return await apiFetch("/auth/impersonate/list");
}

/**
 * Get current impersonation status
 * @returns {Promise<Object>} Current impersonation state
 */
async function status() {
  return await apiFetch("/auth/impersonation-status");
}

/**
 * Get impersonation audit logs
 * @param {Object} [params={}] - Query parameters
 * @param {number} [params.limit] - Number of logs to retrieve
 * @param {number} [params.offset] - Pagination offset
 * @returns {Promise<Object>} Audit logs
 */
async function getLogs(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiFetch(`/admin/impersonation/logs${query ? `?${query}` : ""}`);
}

export const ImpersonationAPI = {
  start,
  stop,
  list,
  status,
  getLogs,
};

export default ImpersonationAPI;