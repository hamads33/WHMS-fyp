// lib/api/plugins.js
/**
 * Plugins API Client - Compatible with Runtime Plugin Engine Backend
 * 
 * This client is designed to work with the filesystem-based plugin engine
 * that loads, verifies, and executes plugins in real-time.
 * 
 * NOT a marketplace client - use for plugin management and execution.
 */

import { apiFetch } from "./client";

export const PluginsAPI = {
  // ===================================
  // PLUGIN LISTING & DISCOVERY
  // ===================================

  /**
   * List all installed and loaded plugins
   * @param {Object} params - Filter options
   * @param {boolean} params.enabled - Filter by enabled status
   * @returns {Promise<Array>} Array of plugin metadata
   */
  async listPlugins(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await apiFetch(`/plugins${query ? `?${query}` : ""}`);
    
    // Backend returns { ok: true, plugins: [...] } or direct array
    if (res.plugins) return res.plugins;
    if (Array.isArray(res)) return res;
    return [];
  },

  /**
   * Get detailed plugin metadata
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<Object>} Plugin metadata with manifest
   */
  async getPluginDetails(pluginId) {
    const res = await apiFetch(`/plugins/${pluginId}/metadata`);
    
    // Extract metadata from response
    return res.metadata || res;
  },

  /**
   * Search plugins by name or description
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching plugins
   */
  async searchPlugins(query) {
    const plugins = await this.listPlugins();
    const q = query.toLowerCase();
    
    return plugins.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q))
    );
  },

  /**
   * Check if plugin is enabled
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} Whether plugin is enabled
   */
  async isPluginEnabled(pluginId) {
    try {
      const plugin = await this.getPluginDetails(pluginId);
      return plugin.enabled !== false;
    } catch (err) {
      return false;
    }
  },

  // ===================================
  // PLUGIN INSTALLATION
  // ===================================

  /**
   * Install plugin from folder (development)
   * @param {string} pluginId - Plugin ID
   * @param {string} sourceDir - Path to plugin folder
   * @returns {Promise<Object>} Installation result
   */
  async installFromFolder(pluginId, sourceDir) {
    return await apiFetch("/plugins/install/folder", {
      method: "POST",
      body: JSON.stringify({ pluginId, sourceDir }),
    });
  },

  /**
   * Install plugin from ZIP file
   * @param {File|Blob} file - ZIP file containing plugin
   * @param {string} pluginId - Optional plugin ID (auto-detect if not provided)
   * @returns {Promise<Object>} Installation result
   */
  async installFromZip(file, pluginId = null) {
    const formData = new FormData();
    formData.append("file", file);
    
    if (pluginId) {
      formData.append("pluginId", pluginId);
    }

    return await apiFetch("/plugins/install/zip", {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - let browser handle it
      headers: {
        "Content-Type": undefined,
      },
    });
  },

  /**
   * Upload and install plugin from FormData
   * @param {FormData} formData - Form with 'file' field
   * @returns {Promise<Object>} Installation result
   */
  async uploadPlugin(formData) {
    return await apiFetch("/plugins/install/zip", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": undefined,
      },
    });
  },

  // ===================================
  // PLUGIN MANAGEMENT
  // ===================================

  /**
   * Uninstall plugin (move to trash)
   * @param {string} pluginId - Plugin ID
   * @param {Object} options - Options
   * @param {string} options.actor - User performing action (default: 'system')
   * @returns {Promise<Object>} Uninstall result with trash path
   */
  async uninstallPlugin(pluginId, options = {}) {
    return await apiFetch(`/plugins/${pluginId}`, {
      method: "DELETE",
      body: JSON.stringify({ actor: options.actor || "system" }),
    });
  },

  /**
   * Restore plugin from trash
   * @param {string} pluginId - Plugin ID
   * @param {Object} options - Options
   * @param {string} options.actor - User performing action
   * @returns {Promise<Object>} Restore result
   */
  async restorePlugin(pluginId, options = {}) {
    return await apiFetch(`/plugins/${pluginId}/restore`, {
      method: "POST",
      body: JSON.stringify({ actor: options.actor || "system" }),
    });
  },

  /**
   * Permanently delete plugin from trash
   * @param {string} pluginId - Plugin ID
   * @param {Object} options - Options
   * @param {string} options.actor - User performing action
   * @returns {Promise<Object>} Delete result
   */
  async deleteFromTrash(pluginId, options = {}) {
    return await apiFetch(`/plugins/trash/${pluginId}`, {
      method: "DELETE",
      body: JSON.stringify({ actor: options.actor || "system" }),
    });
  },

  /**
   * List trashed plugins
   * @returns {Promise<Array>} Array of trashed plugins
   */
  async listTrash() {
    const res = await apiFetch("/plugins/trash/list");
    return res.trash || [];
  },

  /**
   * Check if plugin is trashed
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} Whether plugin is in trash
   */
  async isTrashed(pluginId) {
    const trash = await this.listTrash();
    return trash.some(t => t.id === pluginId);
  },

  // ===================================
  // PLUGIN ACTIONS
  // ===================================

  /**
   * List all actions available in a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<Array>} Array of action metadata
   */
  async getActions(pluginId) {
    const res = await apiFetch(`/plugins/${pluginId}/actions`);
    
    // Handle different response formats
    if (res.actions) return res.actions;
    if (Array.isArray(res)) return res;
    return [];
  },

  /**
   * Execute a plugin action
   * @param {string} pluginId - Plugin ID
   * @param {string} actionName - Action name
   * @param {Object} meta - Action metadata/input
   * @param {number} timeout - Request timeout in ms
   * @returns {Promise<Object>} Action result
   */
  async executeAction(pluginId, actionName, meta = {}, timeout = 30000) {
    return await apiFetch(
      `/plugins/${pluginId}/actions/${actionName}`,
      {
        method: "POST",
        body: JSON.stringify(meta),
        signal: AbortSignal.timeout(timeout),
      }
    );
  },

  /**
   * Test a plugin action (with timeout)
   * @param {string} pluginId - Plugin ID
   * @param {Object} options - Test options
   * @param {string} options.actionName - Action to test
   * @param {Object} options.meta - Test data
   * @returns {Promise<Object>} Test result
   */
  async testAction(pluginId, options = {}) {
    const { actionName, meta = {} } = options;
    
    if (!actionName) {
      throw new Error("testAction requires actionName");
    }

    return await apiFetch(
      `/plugins/${pluginId}/test-action`,
      {
        method: "POST",
        body: JSON.stringify({ actionName, meta }),
      }
    );
  },

  /**
   * Get action details
   * @param {string} pluginId - Plugin ID
   * @param {string} actionName - Action name
   * @returns {Promise<Object>} Action metadata
   */
  async getActionDetails(pluginId, actionName) {
    const actions = await this.getActions(pluginId);
    return actions.find(a => a.name === actionName) || null;
  },

  // ===================================
  // PLUGIN CONFIGURATION
  // ===================================

  /**
   * Get plugin configuration
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<Object>} Plugin configuration and settings
   */
  async getConfig(pluginId) {
    return await apiFetch(`/plugins/${pluginId}/config`);
  },

  /**
   * Get plugin configuration schema
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<Object>} JSON Schema for plugin config
   */
  async getConfigSchema(pluginId) {
    const res = await apiFetch(`/plugins/${pluginId}/config`);
    
    // Extract schema if available
    return res.configSchema || null;
  },

  /**
   * Save plugin configuration
   * @param {string} pluginId - Plugin ID
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} Saved configuration
   */
  async saveConfig(pluginId, config) {
    return await apiFetch(`/plugins/${pluginId}/config`, {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  /**
   * Save a single config setting
   * @param {string} pluginId - Plugin ID
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {Promise<Object>} Saved setting
   */
  async setConfigValue(pluginId, key, value) {
    return await this.saveConfig(pluginId, { [key]: value });
  },

  /**
   * Get a single config value
   * @param {string} pluginId - Plugin ID
   * @param {string} key - Setting key
   * @returns {Promise<*>} Setting value or null
   */
  async getConfigValue(pluginId, key) {
    const config = await this.getConfig(pluginId);
    
    // Handle different response formats
    const settings = config.settings || config.config || config;
    return settings[key] || null;
  },

  /**
   * Enable plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<Object>} Updated config
   */
  async enablePlugin(pluginId) {
    return await this.saveConfig(pluginId, { enabled: true });
  },

  /**
   * Disable plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<Object>} Updated config
   */
  async disablePlugin(pluginId) {
    return await this.saveConfig(pluginId, { enabled: false });
  },

  // ===================================
  // PLUGIN UI & PAGES
  // ===================================

  /**
   * Get plugin UI frame/page
   * @param {string} pluginId - Plugin ID
   * @returns {string} URL to plugin UI frame
   */
  getPluginUIUrl(pluginId) {
    return `/plugins/ui/${pluginId}/frame`;
  },

  /**
   * Get plugin static asset URL
   * @param {string} pluginId - Plugin ID
   * @param {string} filePath - Path to file (relative to plugin root)
   * @returns {string} URL to asset
   */
  getPluginAssetUrl(pluginId, filePath) {
    return `/plugins/ui/${pluginId}/${filePath}`;
  },

  /**
   * Load plugin UI in iframe
   * @param {string} pluginId - Plugin ID
   * @param {HTMLElement} container - DOM element to mount iframe
   * @returns {HTMLIFrameElement} Iframe element
   */
  mountPluginUI(pluginId, container) {
    if (!container) {
      throw new Error("Container element required");
    }

    const iframe = document.createElement("iframe");
    iframe.src = this.getPluginUIUrl(pluginId);
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.sandbox.add("allow-scripts", "allow-same-origin", "allow-forms");

    container.appendChild(iframe);
    return iframe;
  },

  // ===================================
  // PLUGIN MENU INTEGRATION
  // ===================================

  /**
   * Get menu contributions from all plugins
   * @returns {Promise<Array>} Menu items from plugins
   */
  async getMenuContributions() {
    const res = await apiFetch("/plugins/menu");
    return res.menu || [];
  },

  /**
   * Get menu items from specific plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<Object>} Menu configuration
   */
  async getPluginMenu(pluginId) {
    const plugin = await this.getPluginDetails(pluginId);
    const manifest = plugin.manifest || {};
    const ui = manifest.ui || {};
    
    return ui.menu || null;
  },

  // ===================================
  // PLUGIN MANIFEST
  // ===================================

  /**
   * Get plugin manifest
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<Object>} Plugin manifest
   */
  async getManifest(pluginId) {
    const plugin = await this.getPluginDetails(pluginId);
    return plugin.manifest || {};
  },

  /**
   * Get plugin name
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<string>} Plugin name
   */
  async getPluginName(pluginId) {
    const plugin = await this.getPluginDetails(pluginId);
    return plugin.name || pluginId;
  },

  /**
   * Get plugin version
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<string>} Plugin version
   */
  async getPluginVersion(pluginId) {
    const plugin = await this.getPluginDetails(pluginId);
    return plugin.version || "unknown";
  },

  /**
   * Get plugin description
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<string>} Plugin description
   */
  async getPluginDescription(pluginId) {
    const manifest = await this.getManifest(pluginId);
    return manifest.description || "";
  },

  /**
   * Get plugin author
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<string>} Plugin author
   */
  async getPluginAuthor(pluginId) {
    const manifest = await this.getManifest(pluginId);
    return manifest.author || "Unknown";
  },

  // ===================================
  // PLUGIN DEPENDENCIES
  // ===================================

  /**
   * Get plugin dependencies
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<Object>} Dependencies from manifest
   */
  async getDependencies(pluginId) {
    const manifest = await this.getManifest(pluginId);
    return manifest.dependencies || {};
  },

  /**
   * Get plugin hooks
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<Object>} Hooks defined in manifest
   */
  async getHooks(pluginId) {
    const manifest = await this.getManifest(pluginId);
    return manifest.hooks || {};
  },

  // ===================================
  // BATCH OPERATIONS
  // ===================================

  /**
   * Get details for multiple plugins
   * @param {string[]} pluginIds - Array of plugin IDs
   * @returns {Promise<Object>} Map of pluginId -> plugin details
   */
  async getMultiplePlugins(pluginIds) {
    const results = {};
    
    for (const pluginId of pluginIds) {
      try {
        results[pluginId] = await this.getPluginDetails(pluginId);
      } catch (err) {
        results[pluginId] = { error: err.message };
      }
    }
    
    return results;
  },

  /**
   * Execute actions across multiple plugins
   * @param {Array} actions - Array of {pluginId, actionName, meta}
   * @param {Object} options - Options
   * @param {boolean} options.parallel - Execute in parallel (default: sequential)
   * @param {boolean} options.stopOnError - Stop if one fails
   * @returns {Promise<Array>} Results array
   */
  async executeMultipleActions(actions, options = {}) {
    const { parallel = false, stopOnError = false } = options;
    const results = [];

    if (parallel) {
      const promises = actions.map(({ pluginId, actionName, meta }) =>
        this.executeAction(pluginId, actionName, meta).catch(err => ({
          error: err.message,
        }))
      );
      return await Promise.all(promises);
    } else {
      for (const { pluginId, actionName, meta } of actions) {
        try {
          const result = await this.executeAction(pluginId, actionName, meta);
          results.push(result);
        } catch (err) {
          results.push({ error: err.message });
          if (stopOnError) break;
        }
      }
      return results;
    }
  },

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Check plugin health (executes a test action if available)
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} Whether plugin is healthy
   */
  async checkPluginHealth(pluginId) {
    try {
      const actions = await this.getActions(pluginId);
      
      // Try to find and execute a test/health action
      const testAction = actions.find(a => 
        a.name === "test" || 
        a.name === "health" || 
        a.name === "selftest"
      );

      if (testAction) {
        await this.executeAction(pluginId, testAction.name);
      }
      
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Get summary of all plugins with status
   * @returns {Promise<Object>} Summary stats
   */
  async getPluginsSummary() {
    const plugins = await this.listPlugins();
    const trash = await this.listTrash();

    const summary = {
      total: plugins.length,
      enabled: plugins.filter(p => p.enabled !== false).length,
      disabled: plugins.filter(p => p.enabled === false).length,
      trashed: trash.length,
      plugins: plugins.map(p => ({
        id: p.id,
        name: p.name,
        version: p.version,
        enabled: p.enabled !== false,
      })),
    };

    return summary;
  },

  /**
   * Format plugin for display
   * @param {Object} plugin - Plugin object
   * @returns {Object} Formatted plugin
   */
  formatPluginForDisplay(plugin) {
    return {
      id: plugin.id,
      name: plugin.name || plugin.id,
      version: plugin.version || "unknown",
      description: plugin.manifest?.description || "",
      author: plugin.manifest?.author || "Unknown",
      enabled: plugin.enabled !== false,
      loadedAt: plugin.loadedAt,
      manifest: plugin.manifest,
    };
  },

  /**
   * Create plugin info card (HTML)
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<string>} HTML card markup
   */
  async createPluginCard(pluginId) {
    const plugin = await this.getPluginDetails(pluginId);
    const formatted = this.formatPluginForDisplay(plugin);

    return `
      <div class="plugin-card">
        <h3>${formatted.name}</h3>
        <p class="version">v${formatted.version}</p>
        <p class="author">by ${formatted.author}</p>
        <p class="description">${formatted.description}</p>
        <div class="status">
          ${formatted.enabled ? '✓ Enabled' : '✗ Disabled'}
        </div>
      </div>
    `;
  },
};

export default PluginsAPI;