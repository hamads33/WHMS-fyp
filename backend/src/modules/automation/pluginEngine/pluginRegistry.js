// src/modules/automation/pluginEngine/pluginRegistry.js
// Unified plugin registry: supports builtin actions (src/modules/automation/actions/*.js)
// and user plugins (./plugins/actions/<plugin-id>/manifest.json + index.js)
/**
 * Plugin Registry (In-Memory)
 * Stores builtin + user plugins
 */
/**
 * Plugin Registry – In-Memory Store
 * Stores builtin + user plugins loaded by pluginLoader
 */

let registry = {}; // actionId => plugin

module.exports = {
  /** Register plugin */
  register(plugin) {
    registry[plugin.id] = plugin;
  },

  /** Get plugin by ID */
  get(id) {
    return registry[id] || null;
  },

  /** List actions in API-friendly format */
  listActions() {
    return Object.values(registry).map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      schema: p.jsonSchema || null,
      source: p.source || "builtin"
    }));
  },

  /** NEW: return full plugin objects including execute/test */
  getAllMeta() {
    return Object.values(registry).map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      schema: p.jsonSchema || null,
      source: p.source || "builtin",
      hasTest: typeof p.test === "function",
      hasExecute: typeof p.execute === "function"
    }));
  },

  /** Clear all registered plugins (for reload) */
  clear() {
    registry = {};
  }
};
