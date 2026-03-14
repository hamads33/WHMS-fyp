/**
 * example-plugin/plugin.js
 * ------------------------------------------------------------------
 * Minimal plugin template.
 *
 * Copy this folder as a starting point when building a new plugin.
 * Delete what you don't need.
 */

const ExampleService             = require("./service");
const { onUserRegistered, onCronDaily } = require("./hooks");
const buildRouter                = require("./api");

module.exports = {
  meta: {
    name        : "example-plugin",
    version     : "1.0.0",
    description : "Minimal plugin template — copy this folder to start a new plugin",
  },

  register(ctx) {
    const { services, hooks, events, app, logger } = ctx;

    // Register a service
    services.register("exampleService", new ExampleService({ logger }));

    // Register hooks
    hooks.register("user.registered", onUserRegistered, this.meta.name);

    // Listen to cron events
    events.on("cron.daily", onCronDaily);

    // Mount routes
    if (app) {
      app.use("/api/plugins/example", buildRouter(ctx));
    }

    logger.info("[example-plugin] Plugin registered");
  },

  boot(ctx) {
    ctx.logger.info("[example-plugin] Plugin booted");
  },

  shutdown(ctx) {
    ctx.logger.info("[example-plugin] Plugin shutting down");
  },
};
