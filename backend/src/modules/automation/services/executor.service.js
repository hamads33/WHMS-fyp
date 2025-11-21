// src/modules/automation/services/executor.service.js
const path = require("path");

class ExecutorService {
  constructor({ prisma, logger, audit, app }) {
    this.prisma = prisma;
    this.logger = logger || console;
    this.audit = audit;
    this.app = app;   // REQUIRED for plugin engine (registry + vmExecutor)
  }

  async run({ actionType, actionMeta }) {
    // ------------------------------------------
    // PLUGIN EXECUTION
    // ------------------------------------------
    if (typeof actionType === "string" && actionType.startsWith("plugin:")) {
      const parts = actionType.split(":");

      if (parts.length < 3) {
        throw new Error(
          "Invalid plugin actionType. Expected plugin:<pluginId>:<actionName>"
        );
      }

      const pluginId = parts[1];
      const actionName = parts.slice(2).join(":");

      const pluginEngine = this.app.locals.pluginEngine;
      if (!pluginEngine) {
        throw new Error("Plugin engine missing (app.locals.pluginEngine)");
      }

      const { registry, vmExecutor, plugins } = pluginEngine;
      const action = registry.getAction(pluginId, actionName);

      if (!action) {
        throw new Error(`Plugin action not registered: ${pluginId}::${actionName}`);
      }

      const pluginEntry = plugins[pluginId];
      const pluginDir = pluginEntry
        ? pluginEntry.base
        : path.join(process.cwd(), "plugins", "actions", pluginId);

      const result = await vmExecutor.run({
        pluginId,
        pluginDir,
        actionFile: action.file,
        fnName: action.fnName || null,
        meta: actionMeta || {}
      });

      return result;
    }

    // ------------------------------------------
    // BUILT-IN ACTIONS
    // ------------------------------------------
    return this.runBuiltin({ actionType, actionMeta });
  }

  async runBuiltin({ actionType }) {
    this.logger.info(`Executing built-in action: ${actionType}`);
    return { ok: true };
  }
}

// IMPORTANT: export class directly
module.exports = ExecutorService;
