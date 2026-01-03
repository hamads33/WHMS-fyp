// src/modules/plugins/pluginEngine/registry.js
// Thread-safe registry with proper state management

class PluginRegistry {
  constructor({ logger = console } = {}) {
    this.plugins = new Map();
    this.actions = new Map();
    this.hooks = new Map();
    this.trash = new Map();
    this.config = new Map();
    this.logger = logger;
  }

  /* ========================================
     Plugin Management
  ======================================== */

  register(pluginId, meta) {
    return this.registerPlugin(pluginId, meta);
  }

  registerPlugin(pluginId, meta) {
    if (!pluginId) {
      throw new Error("Plugin ID required");
    }

    this.plugins.set(pluginId, {
      ...meta,
      id: pluginId,
      registeredAt: meta.registeredAt || new Date()
    });

    if (!this.actions.has(pluginId)) {
      this.actions.set(pluginId, new Map());
    }

    this.logger.info(`PluginRegistry: registered plugin ${pluginId}`);
  }

  remove(pluginId) {
    this.plugins.delete(pluginId);
    this.actions.delete(pluginId);
    this.config.delete(pluginId);

    // Clean hooks
    for (const [event, list] of this.hooks.entries()) {
      const filtered = list.filter(h => h.pluginId !== pluginId);
      if (filtered.length > 0) {
        this.hooks.set(event, filtered);
      } else {
        this.hooks.delete(event);
      }
    }

    this.logger.info(`PluginRegistry: removed plugin ${pluginId}`);
  }

  clear() {
    this.plugins.clear();
    this.actions.clear();
    this.hooks.clear();
    this.config.clear();
    // Don't clear trash
    this.logger.info("PluginRegistry: cleared all plugins");
  }

  setAll(mapObj) {
    // Don't clear, just update
    if (!mapObj || typeof mapObj !== "object") return;
    
    for (const [id, meta] of Object.entries(mapObj)) {
      this.registerPlugin(id, meta);
    }
    
    this.logger.info("PluginRegistry: setAll completed");
  }

  list() {
    return Array.from(this.plugins.values());
  }

  get(pluginId) {
    return this.plugins.get(pluginId) || null;
  }

  getPlugin(pluginId) {
    return this.get(pluginId);
  }

  has(pluginId) {
    return this.plugins.has(pluginId);
  }

  /* ========================================
     Action Management
  ======================================== */

  registerAction(pluginId, actionName, actionInfo) {
    if (!pluginId || !actionName) {
      throw new Error("Plugin ID and action name required");
    }

    if (!this.actions.has(pluginId)) {
      this.actions.set(pluginId, new Map());
    }

    this.actions.get(pluginId).set(actionName, {
      ...actionInfo,
      pluginId,
      actionName,
      registeredAt: new Date()
    });

    this.logger.info(`PluginRegistry: registered action ${pluginId}::${actionName}`);
  }

  getAction(pluginId, actionName) {
    const pluginActions = this.actions.get(pluginId);
    if (!pluginActions) return null;
    return pluginActions.get(actionName) || null;
  }

  getActions(pluginId) {
    const pluginActions = this.actions.get(pluginId);
    if (!pluginActions) return [];
    return Array.from(pluginActions.keys());
  }

  listActions(pluginId) {
    const pluginActions = this.actions.get(pluginId);
    if (!pluginActions) return [];
    
    return Array.from(pluginActions.entries()).map(([name, info]) => ({
      name,
      ...info
    }));
  }

  setActionsForPlugin(pluginId, actionsObj = {}) {
    const map = new Map();
    for (const [name, info] of Object.entries(actionsObj)) {
      map.set(name, info);
    }
    this.actions.set(pluginId, map);
  }

  /* ========================================
     Hook Management
  ======================================== */

  registerHook(pluginId, eventName, actionPath) {
    if (!eventName || !pluginId || !actionPath) {
      throw new Error("Event name, plugin ID, and action path required");
    }

    if (!this.hooks.has(eventName)) {
      this.hooks.set(eventName, []);
    }

    const hooks = this.hooks.get(eventName);
    
    // Prevent duplicates
    const exists = hooks.some(
      h => h.pluginId === pluginId && h.actionPath === actionPath
    );

    if (!exists) {
      hooks.push({ pluginId, actionPath });
      this.logger.info(`PluginRegistry: registered hook ${pluginId} -> ${eventName}`);
    }
  }

  getHooks(eventName) {
    return this.hooks.get(eventName) || [];
  }

  listHooks() {
    const out = {};
    for (const [eventName, arr] of this.hooks.entries()) {
      out[eventName] = arr.slice();
    }
    return out;
  }

  /* ========================================
     Configuration Management
  ======================================== */

  setConfig(pluginId, config) {
    if (!pluginId) {
      throw new Error("Plugin ID required");
    }

    const existing = this.config.get(pluginId) || {};
    this.config.set(pluginId, { ...existing, ...config });

    // Also update plugin object if exists
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.config = { ...plugin.config, ...config };
      
      // Handle enabled flag
      if (typeof config.enabled !== "undefined") {
        plugin.enabled = !!config.enabled;
      }
    }

    this.logger.info(`PluginRegistry: updated config for ${pluginId}`);
  }

  getConfig(pluginId) {
    return this.config.get(pluginId) || null;
  }

  /* ========================================
     Trash Management
  ======================================== */

  trashPlugin(pluginId, opts = {}) {
    if (!pluginId) return false;

    const meta = opts.meta || this.get(pluginId) || null;
    const trashedAt = opts.trashedAt || new Date();
    const trashPath = opts.trashPath || null;

    // Remove from active
    this.remove(pluginId);

    // Add to trash
    this.trash.set(pluginId, {
      id: pluginId,
      meta,
      trashedAt,
      trashPath
    });

    this.logger.info(
      `PluginRegistry: trashed plugin ${pluginId} at ${trashedAt.toISOString()}`
    );

    return true;
  }

  restorePlugin(pluginId) {
    if (!this.trash.has(pluginId)) return false;

    const entry = this.trash.get(pluginId);
    const meta = entry.meta || null;

    // Restore to active
    if (meta) {
      this.registerPlugin(pluginId, {
        ...meta,
        restoredAt: new Date(),
        enabled: true
      });
    } else {
      this.registerPlugin(pluginId, {
        id: pluginId,
        name: pluginId,
        version: "1.0.0",
        restoredAt: new Date(),
        enabled: true
      });
    }

    this.trash.delete(pluginId);
    this.logger.info(`PluginRegistry: restored plugin ${pluginId} from trash`);

    return true;
  }

  deleteFromTrash(pluginId) {
    if (!this.trash.has(pluginId)) return false;

    this.trash.delete(pluginId);
    this.logger.info(
      `PluginRegistry: permanently deleted plugin ${pluginId} from trash`
    );

    return true;
  }

  listTrash() {
    return Array.from(this.trash.values());
  }

  getTrash(pluginId) {
    return this.trash.get(pluginId) || null;
  }

  /* ========================================
     Statistics
  ======================================== */

  getStats() {
    return {
      totalPlugins: this.plugins.size,
      totalActions: Array.from(this.actions.values()).reduce(
        (sum, map) => sum + map.size,
        0
      ),
      totalHooks: Array.from(this.hooks.values()).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
      trashedPlugins: this.trash.size
    };
  }
}

// Export singleton instance
module.exports = new PluginRegistry();