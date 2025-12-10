/**
 * Simple in-memory metadata registry for plugins.
 * Stores manifest + computed meta so PluginInstallerService can register plugins.
 */

const store = new Map();

module.exports = {
  /**
   * Register or update plugin metadata
   * @param {string} pluginId
   * @param {object} manifest
   */
  register(pluginId, manifest) {
    if (!pluginId) return;

    store.set(pluginId, {
      id: pluginId,
      manifest,
      name: manifest.name || pluginId,
      version: manifest.version || "1.0.0",
      registeredAt: new Date()
    });
  },

  /**
   * Retrieve metadata for a single plugin
   */
  get(pluginId) {
    return store.get(pluginId) || null;
  },

  /**
   * List all registered plugins with metadata
   */
  list() {
    return Array.from(store.values());
  },

  /**
   * Clear registry — used when reloading all plugins
   */
  clear() {
    store.clear();
  }
};
