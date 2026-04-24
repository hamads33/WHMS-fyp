/**
 * service.container.js
 * ------------------------------------------------------------------
 * Simple dependency injection container.
 *
 * Plugins and core modules register named services here.
 * Other plugins can then retrieve them by name without hard imports.
 *
 * Usage:
 *   container.register("paymentGateway", new StripeGateway());
 *   const gw = container.get("paymentGateway");
 *
 * All registrations are singletons — the same instance is returned
 * every time get() is called for the same name.
 */

class ServiceContainer {
  constructor() {
    // Map of name → service instance
    this._services = new Map();
  }

  /**
   * register
   * Register a named service instance.
   * Throws if a service with the same name is already registered.
   *
   * @param {string} name      - Unique service identifier
   * @param {*}      instance  - The service instance (object, class instance, function…)
   */
  register(name, instance) {
    if (this._services.has(name)) {
      throw new Error(`ServiceContainer: service "${name}" is already registered`);
    }
    this._services.set(name, instance);
  }

  /**
   * get
   * Retrieve a registered service by name.
   * Returns null if not found (caller decides how to handle missing deps).
   *
   * @param  {string} name
   * @returns {*|null}
   */
  get(name) {
    return this._services.get(name) ?? null;
  }

  /**
   * has
   * Check whether a service has been registered.
   *
   * @param  {string} name
   * @returns {boolean}
   */
  has(name) {
    return this._services.has(name);
  }

  /**
   * list
   * Returns all registered service names (useful for debugging).
   *
   * @returns {string[]}
   */
  list() {
    return [...this._services.keys()];
  }
}

// Export a single shared instance (singleton)
module.exports = new ServiceContainer();
