// src/modules/plugins/pluginEngine/registry.js
// Enhanced registry with trash/bin support and simple event logging.
//
// Based on your original registry implementation but extended to
// support soft-delete / trash / restore operations.
// Original reference: your registry implementation. :contentReference[oaicite:3]{index=3}

const fs = require("fs");
const path = require("path");

class PluginRegistry {
  constructor({ logger = console } = {}) {
    this.plugins = new Map(); // pluginId -> meta
    this.actions = new Map(); // pluginId -> Map(actionName -> info)
    this.hooks = new Map();   // eventName -> [{ pluginId, actionPath }]
    this.trash = new Map();   // pluginId -> { meta, trashedAt, trashPath }
    this.logger = logger;
  }

  /* Plugin-level API */
  register(pluginId, meta) {
    return this.registerPlugin(pluginId, meta);
  }

  registerPlugin(pluginId, meta) {
    this.plugins.set(pluginId, meta);
    if (!this.actions.has(pluginId)) this.actions.set(pluginId, new Map());
    this.logger.info(`PluginRegistry: registered plugin ${pluginId}`);
  }

  remove(pluginId) {
    this.plugins.delete(pluginId);
    this.actions.delete(pluginId);
    // clean hooks
    for (const [event, list] of this.hooks.entries()) {
      this.hooks.set(event, list.filter(h => h.pluginId !== pluginId));
    }
    this.logger.info(`PluginRegistry: removed plugin ${pluginId}`);
  }

  clear() {
    this.plugins.clear();
    this.actions.clear();
    this.hooks.clear();
    this.trash.clear();
    this.logger.info("PluginRegistry: cleared all plugins");
  }

  setAll(mapObj) {
    this.clear();
    if (!mapObj || typeof mapObj !== "object") return;
    for (const [id, meta] of Object.entries(mapObj)) {
      this.registerPlugin(id, meta);
    }
    this.logger.info("PluginRegistry: setAll completed");
  }

  list() {
    return [...this.plugins.values()];
  }

  get(pluginId) {
    return this.plugins.get(pluginId) || null;
  }

  // alias for compatibility
  getPlugin(pluginId) {
    return this.get(pluginId);
  }

  /* Action API */
  registerAction(pluginId, actionName, actionInfo) {
    if (!this.actions.has(pluginId)) this.actions.set(pluginId, new Map());
    this.actions.get(pluginId).set(actionName, actionInfo);
    this.logger.info(`PluginRegistry: registered action ${pluginId}::${actionName}`);
  }

  listActions(pluginId) {
    const m = this.actions.get(pluginId);
    if (!m) return [];
    return [...m.entries()].map(([name, info]) => ({ name, ...info }));
  }

  getAction(pluginId, actionName) {
    const m = this.actions.get(pluginId);
    if (!m) return null;
    return m.get(actionName) || null;
  }

  getActions(pluginId) {
    const m = this.actions.get(pluginId);
    if (!m) return [];
    return [...m.keys()];
  }

  setActionsForPlugin(pluginId, actionsObj = {}) {
    const map = new Map();
    for (const [name, info] of Object.entries(actionsObj)) {
      map.set(name, info);
    }
    this.actions.set(pluginId, map);
  }

  /* -----------------------------
   * Hook APIs
   * ----------------------------- */

  registerHook(pluginId, eventName, actionPath) {
    if (!eventName) return;
    if (!this.hooks.has(eventName)) this.hooks.set(eventName, []);
    this.hooks.get(eventName).push({ pluginId, actionPath });
    this.logger.info(`PluginRegistry: registered hook ${pluginId} -> ${eventName}`);
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

  /* -----------------------------
   * Trash / Soft-delete API
   * ----------------------------- */

  /**
   * Mark plugin as trashed: stores meta in this.trash and removes from active maps.
   * @param {string} pluginId
   * @param {object} opts { trashedAt: Date, trashPath: string, meta: object }
   */
  trashPlugin(pluginId, opts = {}) {
    if (!pluginId) return false;
    const meta = opts.meta || this.get(pluginId) || null;
    const trashedAt = opts.trashedAt || new Date();
    const trashPath = opts.trashPath || null;

    // remove active entries
    this.remove(pluginId);

    // store in trash map
    this.trash.set(pluginId, {
      id: pluginId,
      meta,
      trashedAt,
      trashPath
    });

    this.logger.info(`PluginRegistry: trashed plugin ${pluginId} at ${trashedAt.toISOString()}`);
    return true;
  }

  /**
   * Restore plugin from trash into active registry.
   * NOTE: caller must ensure files are moved back to plugins/actions/<pluginId>
   * and loader will re-register actions when reloaded.
   */
  restorePlugin(pluginId) {
    if (!this.trash.has(pluginId)) return false;
    const entry = this.trash.get(pluginId);
    const meta = entry.meta || null;

    // re-register plugin metadata (loader will re-register full info)
    if (meta) {
      this.registerPlugin(pluginId, meta);
    } else {
      // If no meta available, create minimal placeholder
      this.registerPlugin(pluginId, { id: pluginId, name: pluginId, version: "1.0.0" });
    }

    this.trash.delete(pluginId);
    this.logger.info(`PluginRegistry: restored plugin ${pluginId} from trash`);
    return true;
  }

  /**
   * Permanently remove from trash (clean up all stored meta)
   */
  deleteFromTrash(pluginId) {
    if (!this.trash.has(pluginId)) return false;
    this.trash.delete(pluginId);
    this.logger.info(`PluginRegistry: permanently deleted plugin ${pluginId} from trash`);
    return true;
  }

  /**
   * List trashed items (returns array of { id, meta, trashedAt, trashPath })
   */
  listTrash() {
    return Array.from(this.trash.values());
  }

  getTrash(pluginId) {
    return this.trash.get(pluginId) || null;
  }
}

// export single instance (singleton)
module.exports = new PluginRegistry();
