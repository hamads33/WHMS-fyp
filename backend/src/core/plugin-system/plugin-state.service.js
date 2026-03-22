/**
 * plugin-state.service.js
 * ------------------------------------------------------------------
 * In-memory enable/disable state for installed plugins + fine-grained lifecycle tracking.
 *
 * Rules:
 *   - A plugin is "installed" once PluginManager loads it.
 *   - All installed plugins start as enabled by default.
 *   - Disabling a plugin prevents its hook handlers from firing.
 *   - Plugin files are never deleted — just logically disabled.
 *
 * Lifecycle states:
 *   queued       → install job enqueued, awaiting execution
 *   downloading  → downloading plugin zip
 *   extracting   → extracting zip file
 *   validating   → validating plugin structure
 *   booting      → plugin.register() and plugin.boot() running
 *   active       → successfully loaded and enabled
 *   failed       → installation or boot failed
 *   disabled     → plugin is installed but disabled (user toggled off)
 *
 * State sets:
 *   _installed  — Set of plugin names that have been loaded
 *   _disabled   — Set of plugin names currently disabled
 *   _states     — Map of plugin name → current lifecycle state (optional, defaults to "active")
 *
 * Enabled = installed AND NOT disabled AND state !== "failed".
 */

class PluginStateService {
  constructor() {
    this._installed = new Set();
    this._disabled  = new Set();
    this._states    = new Map(); // name → state string
  }

  // ----------------------------------------------------------------
  // Lifecycle state management (fine-grained)
  // ----------------------------------------------------------------

  /**
   * setState
   * Updates the lifecycle state of a plugin.
   * Called by install queue and plugin manager.
   *
   * @param {string} name
   * @param {string} state — one of: queued, downloading, extracting, validating, booting, active, failed, disabled
   */
  setState(name, state) {
    this._states.set(name, state);
  }

  /**
   * getState
   * Returns the current lifecycle state of a plugin.
   * Defaults to "active" if never explicitly set (for backward compatibility).
   *
   * @param {string} name
   * @returns {string}
   */
  getState(name) {
    return this._states.get(name) || (this._installed.has(name) ? "active" : "unknown");
  }

  // ----------------------------------------------------------------
  // Lifecycle — called by PluginManager
  // ----------------------------------------------------------------

  /** Mark a plugin as installed (called on load). Defaults to enabled + active state. */
  markInstalled(name) {
    this._installed.add(name);
    // Set state to "active" unless already in a transitional state (e.g., booting)
    if (!this._states.has(name) || !["queued", "downloading", "extracting", "validating", "booting"].includes(this._states.get(name))) {
      this._states.set(name, "active");
    }
  }

  /** Remove a plugin from tracking (called only if truly unloaded). */
  markUninstalled(name) {
    this._installed.delete(name);
    this._disabled.delete(name);
    this._states.delete(name);
  }

  // ----------------------------------------------------------------
  // Enable / Disable
  // ----------------------------------------------------------------

  /**
   * enable
   * @param  {string} name
   * @returns {{ ok: boolean, message?: string }}
   */
  enable(name) {
    if (!this._installed.has(name)) {
      return { ok: false, message: `Plugin "${name}" is not installed` };
    }
    if (!this._disabled.has(name)) {
      return { ok: true, message: `Plugin "${name}" is already enabled` };
    }
    this._disabled.delete(name);
    return { ok: true };
  }

  /**
   * disable
   * @param  {string} name
   * @returns {{ ok: boolean, message?: string }}
   */
  disable(name) {
    if (!this._installed.has(name)) {
      return { ok: false, message: `Plugin "${name}" is not installed` };
    }
    if (this._disabled.has(name)) {
      return { ok: true, message: `Plugin "${name}" is already disabled` };
    }
    this._disabled.add(name);
    return { ok: true };
  }

  // ----------------------------------------------------------------
  // Query
  // ----------------------------------------------------------------

  /** Returns true when the plugin is installed AND not disabled. */
  isEnabled(name) {
    return this._installed.has(name) && !this._disabled.has(name);
  }

  isDisabled(name) {
    return this._installed.has(name) && this._disabled.has(name);
  }

  isInstalled(name) {
    return this._installed.has(name);
  }

  /** Returns names of all installed plugins. */
  listInstalled() {
    return [...this._installed];
  }

  /** Returns names of all enabled plugins. */
  listEnabled() {
    return [...this._installed].filter(n => !this._disabled.has(n));
  }

  /** Returns names of all disabled plugins. */
  listDisabled() {
    return [...this._disabled];
  }

  /**
   * getAll
   * Returns full state snapshot for every installed plugin.
   *
   * @returns {{ name: string, enabled: boolean, state: string }[]}
   */
  getAll() {
    return [...this._installed].map(name => ({
      name,
      enabled: this.isEnabled(name),
      state: this.getState(name),
    }));
  }
}

// Singleton — shared across PluginManager and HookRegistry
module.exports = new PluginStateService();
