// src/modules/plugins/pluginEngine/registry.js
// Simple in-memory registry for loaded plugins.
// Exposes basic operations used by plugin engine + routes.

class PluginRegistry {
  constructor() {
    // Map pluginId -> metadata object
    this.plugins = Object.create(null);
  }

  /**
   * Register a single plugin metadata object.
   * metadata must include at least: id, manifest, base, indexPath, folder, name, version
   */
  register(pluginId, metadata) {
    if (!pluginId) throw new Error("pluginId required to register");
    this.plugins[pluginId] = Object.assign({}, metadata, { id: pluginId });
  }

  /**
   * Replace the whole plugin set (used after install / reload)
   * @param {Object} pluginsMap - map pluginId -> metadata
   */
  setAll(pluginsMap) {
    this.plugins = Object.create(null);
    for (const [k, v] of Object.entries(pluginsMap || {})) {
      this.register(k, v);
    }
  }

  get(pluginId) {
    return this.plugins[pluginId];
  }

  list() {
    return Object.values(this.plugins);
  }

  listActionTypes() {
    const types = [];
    for (const p of Object.values(this.plugins)) {
      if (p && Array.isArray(p.manifest && p.manifest.actions)) {
        types.push(...p.manifest.actions.map(a => a.type));
      }
    }
    return types;
  }

  has(pluginId) {
    return Boolean(this.plugins[pluginId]);
  }

  clear() {
    this.plugins = Object.create(null);
  }
}

module.exports = new PluginRegistry();
