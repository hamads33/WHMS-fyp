// lib/api/iprules.js
import { apiFetch } from "./api/client";

/**
 * IP Rules API
 * Manages IP access control rules (allow/deny lists)
 * 
 * NOTE: All paths do NOT include /api prefix as NEXT_PUBLIC_API_URL already includes it
 * 
 * @module IpRulesAPI
 */

/**
 * List all IP access rules
 * @param {Object} [params={}] - Query parameters
 * @param {boolean} [params.activeOnly] - Filter for active rules only
 * @param {string} [params.type] - Filter by rule type (ALLOW/DENY)
 * @returns {Promise<Array>} List of IP rules
 */
async function listRules(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await apiFetch(`/ip-rules${query ? `?${query}` : ""}`);
  
  // Handle both response formats for backward compatibility
  return response.rules || response.data || [];
}

/**
 * Create a new IP access rule
 * @param {Object} body - Rule configuration
 * @param {string} body.pattern - IP pattern (e.g., "192.168.1.0/24")
 * @param {string} body.type - Rule type ("ALLOW" or "DENY")
 * @param {string} [body.description] - Optional description
 * @returns {Promise<Object>} Created rule
 */
async function createRule(body) {
  return await apiFetch("/ip-rules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Update an existing IP access rule
 * @param {number|string} id - Rule ID
 * @param {Object} body - Fields to update
 * @param {string} [body.pattern] - IP pattern
 * @param {string} [body.type] - Rule type ("ALLOW" or "DENY")
 * @param {string} [body.description] - Description
 * @param {boolean} [body.active] - Active status
 * @returns {Promise<Object>} Updated rule
 */
async function updateRule(id, body) {
  return await apiFetch(`/ip-rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Delete an IP access rule
 * @param {number|string} id - Rule ID to delete
 * @returns {Promise<Object>} Success response
 */
async function deleteRule(id) {
  return await apiFetch(`/ip-rules/${id}`, {
    method: "DELETE",
  });
}

/**
 * Test an IP address against current rules
 * @param {string} ip - IP address to test
 * @returns {Promise<Object>} Test result (allowed/denied)
 */
async function testIp(ip) {
  return await apiFetch("/ip-rules/test", {
    method: "POST",
    body: JSON.stringify({ ip }),
  });
}

export const IpRulesAPI = {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  testIp,
};

export default IpRulesAPI;