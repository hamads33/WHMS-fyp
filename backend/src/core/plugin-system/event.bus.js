/**
 * event.bus.js
 * ------------------------------------------------------------------
 * Async event bus for loosely coupled communication between modules
 * and plugins.
 *
 * Built on Node.js EventEmitter — no external dependencies.
 *
 * Usage:
 *   eventBus.on("invoice.paid", async (payload) => { ... });
 *   eventBus.emit("invoice.paid", { invoiceId: 123 });
 *
 * Cron events follow the naming convention:
 *   "cron.daily"   → fires once a day
 *   "cron.hourly"  → fires once an hour
 * Plugins can listen to these to schedule recurring work.
 */

const { EventEmitter } = require("events");

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase listener limit to support many plugins listening to the same event
    this.setMaxListeners(100);

    // Track listeners by plugin name for cleanup on plugin disable
    // Map: pluginName → Set of { event, handler } pairs
    this._pluginListeners = new Map();
  }

  /**
   * emit
   * Overrides EventEmitter.emit to add simple debug logging.
   * All handlers are called synchronously by EventEmitter internals,
   * but handlers themselves can be async.
   *
   * @param {string} eventName
   * @param {*}      payload
   */
  emit(eventName, payload) {
    return super.emit(eventName, payload);
  }

  /**
   * emitAsync
   * Fires an event and waits for all async listeners to settle.
   * Useful when you need to ensure all handlers complete before continuing.
   *
   * @param  {string} eventName
   * @param  {*}      payload
   * @returns {Promise<void>}
   */
  async emitAsync(eventName, payload) {
    const listeners = this.listeners(eventName);
    await Promise.allSettled(listeners.map((fn) => Promise.resolve(fn(payload))));
  }

  /**
   * onFromPlugin
   * Register an event listener and track it for cleanup when the plugin disables.
   *
   * @param {string} pluginName - Name of the plugin registering this listener
   * @param {string} eventName - Event to listen for
   * @param {Function} handler - Handler function
   */
  onFromPlugin(pluginName, eventName, handler) {
    if (!pluginName || !eventName || typeof handler !== "function") {
      throw new Error("Invalid arguments: pluginName, eventName, and handler function required");
    }

    // Register the listener
    this.on(eventName, handler);

    // Track for cleanup
    if (!this._pluginListeners.has(pluginName)) {
      this._pluginListeners.set(pluginName, []);
    }
    this._pluginListeners.get(pluginName).push({ event: eventName, handler });
  }

  /**
   * unregisterPlugin
   * Remove all event listeners registered by a plugin.
   * Call this when a plugin is disabled or unloaded.
   *
   * @param {string} pluginName - Name of the plugin
   */
  unregisterPlugin(pluginName) {
    const listeners = this._pluginListeners.get(pluginName);
    if (!listeners) return;

    for (const { event, handler } of listeners) {
      this.removeListener(event, handler);
    }

    this._pluginListeners.delete(pluginName);
  }

  /**
   * getPluginListenerCount
   * Returns the number of listeners registered by a specific plugin.
   * Useful for debugging and monitoring.
   *
   * @param {string} pluginName - Name of the plugin
   * @returns {number}
   */
  getPluginListenerCount(pluginName) {
    return this._pluginListeners.get(pluginName)?.length ?? 0;
  }
}

// Export a single shared instance (singleton)
module.exports = new EventBus();
