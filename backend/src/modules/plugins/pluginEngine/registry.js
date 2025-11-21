// src/modules/plugins/pluginEngine/registry.js
const path = require("path");

class PluginRegistry {
  constructor({ logger = console } = {}) {
    // pluginId -> pluginMeta
    this.plugins = new Map();

    // pluginId -> Map(actionName -> { file, description, meta })
    this.actions = new Map();

    this.logger = logger;
  }

  /* ---------------------------
   * Plugin-level API
   * --------------------------- */

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
    this.logger.info(`PluginRegistry: removed plugin ${pluginId}`);
  }

  clear() {
    this.plugins.clear();
    this.actions.clear();
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

  /* ---------------------------
   * Action API
   * --------------------------- */

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

  setActionsForPlugin(pluginId, actionsObj = {}) {
    const map = new Map();
    for (const [name, info] of Object.entries(actionsObj)) {
      map.set(name, info);
    }
    this.actions.set(pluginId, map);
  }
}

// ❗ FIX: Single shared instance
module.exports = new PluginRegistry();
