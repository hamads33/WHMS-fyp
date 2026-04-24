/**
 * hook.registry.js
 * ------------------------------------------------------------------
 * WHMCS-style hook registry.
 *
 * Hooks let plugins react to core system events (order created,
 * invoice paid, service provisioned, etc.) without modifying core code.
 *
 * Example hook names:
 *   order.created        → fired when a new order is placed
 *   invoice.paid         → fired when an invoice is paid
 *   service.provision    → fired when a service needs provisioning
 *   service.suspend      → fired when a service is suspended
 *   service.terminate    → fired when a service is terminated
 *   user.registered      → fired when a new user registers
 *   backup.success       → fired when a backup completes
 *
 * Usage:
 *   hooks.register("order.created", async (payload) => { ... });
 *   await hooks.trigger("order.created", { orderId: 42 });
 */

// Lazy-require to avoid circular deps — both are singletons
function pluginState() {
  return require("./plugin-state.service");
}

class HookRegistry {
  constructor() {
    // Map of eventName → Array of handler functions
    this._hooks = new Map();
  }

  /**
   * register
   * Attach a handler to a named hook.
   * Multiple handlers per hook are supported and run in registration order.
   *
   * @param {string}   hookName  - Hook identifier (e.g. "order.created")
   * @param {Function} handler   - Async or sync function to call
   * @param {string}   [source]  - Optional label for debugging (e.g. plugin name)
   */
  register(hookName, handler, source = "unknown") {
    if (typeof handler !== "function") {
      throw new Error(`HookRegistry: handler for "${hookName}" must be a function`);
    }

    if (!this._hooks.has(hookName)) {
      this._hooks.set(hookName, []);
    }

    this._hooks.get(hookName).push({ handler, source });
  }

  /**
   * trigger
   * Run all handlers registered for a hook.
   * Handlers are called sequentially (in registration order).
   * A failing handler logs the error but does not block remaining handlers.
   *
   * @param  {string} hookName  - Hook to trigger
   * @param  {*}      payload   - Data passed to each handler
   * @param  {object} [logger]  - Optional logger instance
   * @returns {Promise<Array>}  - Array of { source, result | error } per handler
   */
  async trigger(hookName, payload, logger = console) {
    const entries = this._hooks.get(hookName) || [];
    const results = [];

    const state = pluginState();

    for (const { handler, source } of entries) {
      // Skip handlers from disabled plugins
      if (state.isInstalled(source) && !state.isEnabled(source)) {
        logger.info?.(`[HookRegistry] Skipping hook "${hookName}" from disabled plugin "${source}"`);
        continue;
      }

      try {
        const result = await Promise.resolve(handler(payload));
        results.push({ source, result });
      } catch (err) {
        logger.error(`[HookRegistry] Hook "${hookName}" handler from "${source}" failed: ${err.message}`);
        results.push({ source, error: err.message });
      }
    }

    return results;
  }

  /**
   * list
   * Returns all registered hook names (useful for introspection/debugging).
   *
   * @returns {string[]}
   */
  list() {
    return [...this._hooks.keys()];
  }

  /**
   * count
   * Returns the number of handlers registered for a hook.
   *
   * @param  {string} hookName
   * @returns {number}
   */
  count(hookName) {
    return (this._hooks.get(hookName) || []).length;
  }
}

// Export a single shared instance (singleton)
module.exports = new HookRegistry();
