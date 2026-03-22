/**
 * plugin.interface.js
 * ------------------------------------------------------------------
 * Documents and validates the required plugin contract.
 *
 * Every plugin must export an object with this shape:
 *
 *   module.exports = {
 *     meta: {
 *       name: "my-plugin",
 *       version: "1.0.0",
 *       description: "What this plugin does"
 *     },
 *     register(ctx) { ... },   // Called once: register services, hooks, routes
 *     boot(ctx)     { ... },   // Called once after all plugins are registered
 *     shutdown(ctx) { ... }    // Called on graceful shutdown
 *   };
 *
 * ctx is the PluginContext object provided by PluginManager:
 *   ctx.services  → ServiceContainer  (register/get dependencies)
 *   ctx.events    → EventBus          (emit/on async events)
 *   ctx.hooks     → HookRegistry      (register/trigger lifecycle hooks)
 *   ctx.config    → PluginConfigStore (per-plugin config)
 *   ctx.app       → Express app instance
 *   ctx.prisma    → Prisma client
 *   ctx.logger    → Logger instance
 */

const SUPPORTED_CAPABILITIES = ["hooks", "api", "cron", "billing", "provisioning", "ui"];

/**
 * validatePlugin
 * ------------------------------------------------------------------
 * Checks that a loaded module conforms to the plugin interface.
 * Throws a descriptive error if the contract is not met.
 *
 * @param {object} plugin  - The exported plugin object
 * @param {string} source  - The plugin folder name (for error messages)
 */
function validatePlugin(plugin, source) {
  if (!plugin || typeof plugin !== "object") {
    throw new Error(`Plugin "${source}" must export a plain object`);
  }

  if (!plugin.meta || typeof plugin.meta !== "object") {
    throw new Error(`Plugin "${source}" must export a meta object`);
  }

  const requiredMeta = ["name", "version", "description"];
  for (const key of requiredMeta) {
    if (!plugin.meta[key] || typeof plugin.meta[key] !== "string") {
      throw new Error(`Plugin "${source}" meta.${key} must be a non-empty string`);
    }
  }

  // Optional capabilities — must be an array of known strings if provided
  if (plugin.meta.capabilities !== undefined) {
    if (!Array.isArray(plugin.meta.capabilities)) {
      throw new Error(`Plugin "${source}" meta.capabilities must be an array`);
    }
  }

  // Optional ui — must have adminPages array if provided
  if (plugin.meta.ui !== undefined) {
    if (typeof plugin.meta.ui !== "object" || Array.isArray(plugin.meta.ui)) {
      throw new Error(`Plugin "${source}" meta.ui must be an object`);
    }
    if (plugin.meta.ui.adminPages !== undefined) {
      if (!Array.isArray(plugin.meta.ui.adminPages)) {
        throw new Error(`Plugin "${source}" meta.ui.adminPages must be an array`);
      }
      for (const page of plugin.meta.ui.adminPages) {
        if (!page.id || !page.label) {
          throw new Error(`Plugin "${source}" meta.ui.adminPages entries must have id and label`);
        }
      }
    }
  }

  // Optional permissions — must be an array of strings if provided (not enforced yet)
  if (plugin.meta.permissions !== undefined) {
    if (!Array.isArray(plugin.meta.permissions)) {
      throw new Error(`Plugin "${source}" meta.permissions must be an array`);
    }
    for (const perm of plugin.meta.permissions) {
      if (typeof perm !== "string" || !perm.trim()) {
        throw new Error(`Plugin "${source}" meta.permissions entries must be non-empty strings`);
      }
    }
  }

  const requiredFns = ["register", "boot", "shutdown"];
  for (const fn of requiredFns) {
    if (typeof plugin[fn] !== "function") {
      throw new Error(`Plugin "${source}" must export a "${fn}" function`);
    }
  }
}

/**
 * definePlugin
 * ------------------------------------------------------------------
 * Helper function for cleaner plugin definition.
 *
 * Makes plugin authoring easier by accepting a simpler interface:
 *   { meta, setup }
 *
 * Returns a fully-formed plugin object that matches the required contract.
 *
 * Example usage:
 *
 *   module.exports = definePlugin({
 *     meta: {
 *       name: "analytics-widget",
 *       version: "1.0.0",
 *       description: "Adds an analytics dashboard widget",
 *       capabilities: ["ui"],
 *     },
 *     setup(ctx) {
 *       ctx.hooks.register("dashboard.render", async (payload) => {
 *         return { widget: "analytics", data: ... };
 *       });
 *     },
 *   });
 *
 * @param {object} opts
 * @param {object} opts.meta  - Plugin metadata (name, version, description, etc.)
 * @param {Function} opts.setup - Setup function called during register() phase
 * @returns {object} Full plugin object
 */
function definePlugin({ meta, setup }) {
  if (!meta) {
    throw new Error("definePlugin: meta is required");
  }
  if (typeof setup !== "function") {
    throw new Error("definePlugin: setup must be a function");
  }

  return {
    meta,
    register(ctx) {
      return Promise.resolve(setup(ctx));
    },
    boot(ctx) {
      // Default no-op boot
      return Promise.resolve();
    },
    shutdown(ctx) {
      // Default no-op shutdown
      return Promise.resolve();
    },
  };
}

module.exports = { validatePlugin, definePlugin, SUPPORTED_CAPABILITIES };
