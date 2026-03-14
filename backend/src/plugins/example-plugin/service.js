/**
 * example-plugin/service.js
 * ------------------------------------------------------------------
 * Minimal example service.
 * Copy this file as a starting point when building a new plugin.
 */

class ExampleService {
  constructor({ logger = console } = {}) {
    this.logger = logger;
    this.name   = "example-plugin";
  }

  async doSomething(payload) {
    this.logger.info(`[ExamplePlugin] doSomething called`, payload);
    return { done: true };
  }
}

module.exports = ExampleService;
