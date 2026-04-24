// lib/api/sessions.js
import { apiFetch } from "./api/client";

/**
 * Sessions API
 * Manages user authentication sessions and security
 * 
 * NOTE: All paths do NOT include /api prefix as NEXT_PUBLIC_API_URL already includes it
 * 
 * @module SessionsAPI
 */

/**
 * Get current active session details
 * @returns {Promise<Object>} Current session information
 */
async function getCurrent() {
  return await apiFetch("/auth/sessions/current");
}

/**
 * List all active sessions for the current user
 * @returns {Promise<Object>} Object containing sessions array
 */
async function list() {
  return await apiFetch("/auth/sessions");
}

/**
 * Revoke a specific session by ID
 * @param {string} sessionId - Session ID to revoke
 * @returns {Promise<Object>} Success response
 */
async function revoke(sessionId) {
  return await apiFetch(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

/**
 * Revoke all sessions except the current one
 * Useful for "sign out from all other devices"
 * @returns {Promise<Object>} Success response with count of revoked sessions
 */
async function revokeOthers() {
  return await apiFetch("/auth/sessions/others/all", {
    method: "DELETE",
  });
}

/**
 * Get security logs for session activity
 * @returns {Promise<Array>} Array of security log entries
 */
async function getSecurityLogs() {
  return await apiFetch("/auth/sessions/security/logs");
}

/**
 * Get session statistics
 * @returns {Promise<Object>} Session statistics and metrics
 */
async function getStats() {
  return await apiFetch("/auth/sessions/stats");
}

export const SessionsAPI = {
  getCurrent,
  list,
  revoke,
  revokeOthers,
  getSecurityLogs,
  getStats,
};

export const SessionAPI = SessionsAPI;

export default SessionsAPI;
