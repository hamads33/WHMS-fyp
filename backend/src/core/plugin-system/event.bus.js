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
}

// Export a single shared instance (singleton)
module.exports = new EventBus();
