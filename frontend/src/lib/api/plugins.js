// lib/api/plugins.js
/**
 * Plugins API Client
 * Handles all plugin operations and management
 * ✓ Create/upload plugins
 * ✓ Manage versions
 * ✓ Configure permissions
 * ✓ Monitor execution
 */

import { apiFetch } from "./client";

export const PluginsAPI = {
  // ===================================
  // PLUGIN UPLOAD & CREATION
  // ===================================

  /**
   * Create a new plugin (metadata)
   * @param {Object} pluginData - Plugin metadata
   * @param {string} pluginData.name - Plugin name
   * @param {string} pluginData.description - Plugin description
   * @param {string} pluginData.category - Plugin category
   * @param {string} pluginData.version - Initial version
   * @param {Object} pluginData.manifest - Plugin manifest
   */
  async createPlugin(pluginData) {
    return await apiFetch("/plugins", {
      method: "POST",
      body: JSON.stringify(pluginData),
    });
  },

  /**
   * Upload plugin code/files
   * @param {string} pluginId - Plugin ID
   * @param {FormData} formData - Form data with file(s)
   */
  async uploadPluginFiles(pluginId, formData) {
    return await apiFetch(`/plugins/${pluginId}/upload`, {
      method: "POST",
      body: formData,
      headers: {
        // Let browser set Content-Type for multipart/form-data
        "Content-Type": undefined,
      },
    });
  },

  /**
   * Submit plugin for review/publication
   * @param {string} pluginId - Plugin ID
   */
  async submitPluginForReview(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/submit-review`, {
      method: "POST",
    });
  },

  /**
   * Publish plugin to marketplace
   * @param {string} pluginId - Plugin ID
   */
  async publishPlugin(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/publish`, {
      method: "POST",
    });
  },

  /**
   * Unpublish plugin from marketplace
   * @param {string} pluginId - Plugin ID
   * @param {Object} data - Unpublish data
   * @param {string} data.reason - Reason for unpublishing
   */
  async unpublishPlugin(pluginId, data = {}) {
    return await apiFetch(`/plugins/${pluginId}/unpublish`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ===================================
  // PLUGIN MANAGEMENT
  // ===================================

  /**
   * Get all plugins by current user
   * @param {Object} params - Filter params
   */
  async getMyPlugins(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(`/plugins${query ? `?${query}` : ""}`);
  },

  /**
   * Get plugin details (for developer)
   * @param {string} pluginId - Plugin ID
   */
  async getPluginDetails(pluginId) {
    return await apiFetch(`/plugins/${pluginId}`);
  },

  /**
   * Update plugin information
   * @param {string} pluginId - Plugin ID
   * @param {Object} pluginData - Updated plugin data
   */
  async updatePlugin(pluginId, pluginData) {
    return await apiFetch(`/plugins/${pluginId}`, {
      method: "PUT",
      body: JSON.stringify(pluginData),
    });
  },

  /**
   * Delete a plugin
   * @param {string} pluginId - Plugin ID
   * @param {Object} data - Delete options
   * @param {boolean} data.force - Force delete (including published)
   */
  async deletePlugin(pluginId, data = {}) {
    return await apiFetch(`/plugins/${pluginId}`, {
      method: "DELETE",
      body: JSON.stringify(data),
    });
  },

  // ===================================
  // VERSIONS & RELEASES
  // ===================================

  /**
   * Get all versions of a plugin
   * @param {string} pluginId - Plugin ID
   */
  async getVersions(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/versions`);
  },

  /**
   * Get specific version
   * @param {string} pluginId - Plugin ID
   * @param {string} versionId - Version ID
   */
  async getVersion(pluginId, versionId) {
    return await apiFetch(`/plugins/${pluginId}/versions/${versionId}`);
  },

  /**
   * Create new version
   * @param {string} pluginId - Plugin ID
   * @param {Object} versionData - Version data
   * @param {string} versionData.version - Version number
   * @param {string} versionData.changelog - What changed
   * @param {Object} versionData.manifest - Updated manifest
   */
  async createVersion(pluginId, versionData) {
    return await apiFetch(`/plugins/${pluginId}/versions`, {
      method: "POST",
      body: JSON.stringify(versionData),
    });
  },

  /**
   * Publish a version
   * @param {string} pluginId - Plugin ID
   * @param {string} versionId - Version ID
   */
  async publishVersion(pluginId, versionId) {
    return await apiFetch(`/plugins/${pluginId}/versions/${versionId}/publish`, {
      method: "POST",
    });
  },

  /**
   * Deprecate a version
   * @param {string} pluginId - Plugin ID
   * @param {string} versionId - Version ID
   */
  async deprecateVersion(pluginId, versionId) {
    return await apiFetch(`/plugins/${pluginId}/versions/${versionId}/deprecate`, {
      method: "POST",
    });
  },

  /**
   * Get current/active version
   * @param {string} pluginId - Plugin ID
   */
  async getCurrentVersion(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/versions/current`);
  },

  // ===================================
  // CONFIGURATION & SETTINGS
  // ===================================

  /**
   * Get plugin configuration schema
   * @param {string} pluginId - Plugin ID
   */
  async getConfigSchema(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/config-schema`);
  },

  /**
   * Save plugin configuration
   * @param {string} pluginId - Plugin ID
   * @param {Object} config - Configuration data
   */
  async saveConfig(pluginId, config) {
    return await apiFetch(`/plugins/${pluginId}/config`, {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  /**
   * Get plugin configuration
   * @param {string} pluginId - Plugin ID
   */
  async getConfig(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/config`);
  },

  /**
   * Validate plugin configuration
   * @param {string} pluginId - Plugin ID
   * @param {Object} config - Configuration to validate
   */
  async validateConfig(pluginId, config) {
    return await apiFetch(`/plugins/${pluginId}/config/validate`, {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  // ===================================
  // PERMISSIONS & ACCESS
  // ===================================

  /**
   * Get plugin permissions
   * @param {string} pluginId - Plugin ID
   */
  async getPermissions(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/permissions`);
  },

  /**
   * Update plugin permissions
   * @param {string} pluginId - Plugin ID
   * @param {Object} permissions - Permissions object
   */
  async updatePermissions(pluginId, permissions) {
    return await apiFetch(`/plugins/${pluginId}/permissions`, {
      method: "PUT",
      body: JSON.stringify(permissions),
    });
  },

  /**
   * Get plugin access logs
   * @param {string} pluginId - Plugin ID
   * @param {Object} params - Filter params
   */
  async getAccessLogs(pluginId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/plugins/${pluginId}/access-logs${query ? `?${query}` : ""}`
    );
  },

  // ===================================
  // EXECUTION & MONITORING
  // ===================================

  /**
   * Get plugin execution logs
   * @param {string} pluginId - Plugin ID
   * @param {Object} params - Filter params
   */
  async getExecutionLogs(pluginId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/plugins/${pluginId}/execution-logs${query ? `?${query}` : ""}`
    );
  },

  /**
   * Get plugin resource usage
   * @param {string} pluginId - Plugin ID
   * @param {string} period - Time period (1h, 24h, 7d, 30d)
   */
  async getResourceUsage(pluginId, period = "24h") {
    return await apiFetch(
      `/plugins/${pluginId}/resource-usage?period=${period}`
    );
  },

  /**
   * Get plugin error logs
   * @param {string} pluginId - Plugin ID
   * @param {Object} params - Filter params
   */
  async getErrorLogs(pluginId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/plugins/${pluginId}/error-logs${query ? `?${query}` : ""}`
    );
  },

  /**
   * Restart plugin
   * @param {string} pluginId - Plugin ID
   */
  async restartPlugin(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/restart`, {
      method: "POST",
    });
  },

  /**
   * Stop plugin execution
   * @param {string} pluginId - Plugin ID
   */
  async stopPlugin(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/stop`, {
      method: "POST",
    });
  },

  // ===================================
  // TESTING & VALIDATION
  // ===================================

  /**
   * Test plugin functionality
   * @param {string} pluginId - Plugin ID
   * @param {Object} testData - Test data
   */
  async testPlugin(pluginId, testData) {
    return await apiFetch(`/plugins/${pluginId}/test`, {
      method: "POST",
      body: JSON.stringify(testData),
    });
  },

  /**
   * Validate plugin manifest
   * @param {Object} manifest - Plugin manifest to validate
   */
  async validateManifest(manifest) {
    return await apiFetch("/plugins/validate-manifest", {
      method: "POST",
      body: JSON.stringify(manifest),
    });
  },

  /**
   * Validate plugin code
   * @param {string} pluginId - Plugin ID
   * @param {string} code - Code to validate
   */
  async validateCode(pluginId, code) {
    return await apiFetch(`/plugins/${pluginId}/validate-code`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  /**
   * Check for security vulnerabilities
   * @param {string} pluginId - Plugin ID
   */
  async securityScan(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/security-scan`, {
      method: "POST",
    });
  },

  // ===================================
  // DEPENDENCIES & HOOKS
  // ===================================

  /**
   * Get plugin dependencies
   * @param {string} pluginId - Plugin ID
   */
  async getDependencies(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/dependencies`);
  },

  /**
   * Get plugin hooks
   * @param {string} pluginId - Plugin ID
   */
  async getHooks(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/hooks`);
  },

  /**
   * Get available hooks for plugin to use
   */
  async getAvailableHooks() {
    return await apiFetch("/plugins/available-hooks");
  },

  // ===================================
  // STATISTICS
  // ===================================

  /**
   * Get plugin statistics
   * @param {string} pluginId - Plugin ID
   */
  async getStats(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/stats`);
  },

  /**
   * Get plugin installations over time
   * @param {string} pluginId - Plugin ID
   * @param {string} period - Time period (7d, 30d, 90d, 1y)
   */
  async getInstallationTrend(pluginId, period = "30d") {
    return await apiFetch(
      `/plugins/${pluginId}/stats/installations?period=${period}`
    );
  },

  /**
   * Get active user count
   * @param {string} pluginId - Plugin ID
   */
  async getActiveUsers(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/stats/active-users`);
  },

  // ===================================
  // DEVELOPER TOOLS
  // ===================================

  /**
   * Get developer documentation
   * @param {string} pluginId - Plugin ID
   */
  async getDocs(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/docs`);
  },

  /**
   * Get code examples
   * @param {string} pluginId - Plugin ID
   */
  async getExamples(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/examples`);
  },

  /**
   * Get API reference
   * @param {string} pluginId - Plugin ID
   */
  async getAPIReference(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/api-reference`);
  },

  /**
   * Build plugin for distribution
   * @param {string} pluginId - Plugin ID
   */
  async buildPlugin(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/build`, {
      method: "POST",
    });
  },

  /**
   * Get build status
   * @param {string} pluginId - Plugin ID
   * @param {string} buildId - Build ID
   */
  async getBuildStatus(pluginId, buildId) {
    return await apiFetch(`/plugins/${pluginId}/builds/${buildId}`);
  },
};

export default PluginsAPI;