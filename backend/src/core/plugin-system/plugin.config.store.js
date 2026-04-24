/**
 * plugin.config.store.js
 * ------------------------------------------------------------------
 * Per-plugin configuration storage.
 *
 * Stores arbitrary config objects keyed by plugin name.
 * In production this could be backed by the database or a config file.
 * For now it uses an in-memory Map seeded from environment variables
 * or defaults passed at startup.
 *
 * Usage inside a plugin:
 *   const apiKey = ctx.config.get("my-plugin", "apiKey");
 *   ctx.config.set("my-plugin", "apiKey", "sk-123");
 */

class PluginConfigStore {
  constructor() {
    // Map of pluginName → { key: value, ... }
    this._store = new Map();
  }

  /**
   * init
   * Seed initial configuration for a plugin.
   * Called by PluginManager before calling plugin.register().
   *
   * @param {string} pluginName
   * @param {object} defaults    - Default config values
   */
  init(pluginName, defaults = {}) {
    if (!this._store.has(pluginName)) {
      this._store.set(pluginName, { ...defaults });
    }
  }

  /**
   * get
   * Retrieve a config value for a plugin.
   * Returns undefined if the key doesn't exist.
   *
   * @param  {string} pluginName
   * @param  {string} key
   * @returns {*}
   */
  get(pluginName, key) {
    const config = this._store.get(pluginName) || {};
    return config[key];
  }

  /**
   * set
   * Set a config value for a plugin.
   *
   * @param {string} pluginName
   * @param {string} key
   * @param {*}      value
   */
  set(pluginName, key, value) {
    if (!this._store.has(pluginName)) {
      this._store.set(pluginName, {});
    }
    this._store.get(pluginName)[key] = value;
  }

  /**
   * getAll
   * Retrieve all config for a plugin (returns a shallow copy).
   *
   * @param  {string} pluginName
   * @returns {object}
   */
  getAll(pluginName) {
    return { ...(this._store.get(pluginName) || {}) };
  }

  /**
   * setAll
   * Replace all config for a plugin.
   *
   * @param {string} pluginName
   * @param {object} config
   */
  setAll(pluginName, config) {
    this._store.set(pluginName, { ...config });
  }
}

// Export a single shared instance (singleton)
module.exports = new PluginConfigStore();
