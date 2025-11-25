// src/modules/automation/services/executor.service.js
const path = require("path");

class ExecutorService {
  constructor({ prisma, logger, audit, app }) {
    this.prisma = prisma;
    this.logger = logger || console;
    this.audit = audit;
    this.app = app;   // <-- required!
  }

  async run({ id, taskId, actionType, actionMeta }) {
    // ------------------------------------------
    // WASM ACTIONS: "wasm:<pluginId>:<actionName>"
    // ------------------------------------------
    if (typeof actionType === "string" && actionType.startsWith("wasm:")) {
      const parts = actionType.split(":");
      if (parts.length < 3) {
        throw new Error("Invalid wasm actionType. Expected wasm:<pluginId>:<actionName>");
      }
      const pluginId = parts[1];
      const actionName = parts.slice(2).join(":");

      const pluginEngine = this.app.locals.pluginEngine;
      if (!pluginEngine) throw new Error("Plugin engine missing");

      const { registry, wasmExecutor, plugins } = pluginEngine;
      const action = registry.getAction(pluginId, actionName);
      if (!action) throw new Error(`Plugin action not registered: ${pluginId}::${actionName}`);

      const pluginEntry = plugins[pluginId];
      const pluginDir = pluginEntry ? pluginEntry.base || pluginEntry.root : path.join(process.cwd(), "plugins", "actions", pluginId);

      // action.meta should contain { file: 'plugin.wasm', exportName: 'run' } or registry set the file.
      const wasmFile = (action.file || (action.meta && action.meta.file) || action.wasmFile) ;
      const exportName = action.export || (action.fnName || "run");

      if (!wasmFile) throw new Error("WASM file not specified for action");

      const result = await wasmExecutor.run({
        pluginId,
        pluginDir,
        wasmFile,
        exportName,
        meta: actionMeta || {}
      });

      return result;
    }

    // ------------------------------------------
    // PLUGIN EXECUTION (JS) - existing behavior
    // ------------------------------------------
    if (typeof actionType === "string" && actionType.startsWith("plugin:")) {
      const parts = actionType.split(":");
      if (parts.length < 3) {
        throw new Error("Invalid plugin actionType. Expected plugin:<pluginId>:<actionName>");
      }

      const pluginId = parts[1];
      const actionName = parts.slice(2).join(":");

      const pluginEngine = this.app.locals.pluginEngine;
      if (!pluginEngine) {
        throw new Error("Plugin engine missing");
      }

      const { registry, vmExecutor, plugins } = pluginEngine;
      const action = registry.getAction(pluginId, actionName);

      if (!action) {
        throw new Error(`Plugin action not registered: ${pluginId}::${actionName}`);
      }

      const pluginEntry = plugins[pluginId];
      const pluginDir = pluginEntry
        ? pluginEntry.base || pluginEntry.root
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
    return this.runBuiltin({ id, taskId, actionType, actionMeta });
  }

  async runBuiltin({ id, taskId, actionType, actionMeta }) {
    this.logger.info(`Executing built-in action ${actionType}`);
    return { ok: true };
  }
}

module.exports = ExecutorService;
