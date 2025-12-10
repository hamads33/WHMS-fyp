// src/modules/automation/services/executor.service.js
const path = require("path");

class ExecutorService {
  constructor({ prisma, logger, audit, app }) {
    this.prisma = prisma;
    this.logger = logger || console;
    this.audit = audit;
    this.app = app;
  }

  /**
   * Main execution entrypoint
   */
  async run({ id, taskId, actionType, actionMeta }) {
    if (!actionType) throw new Error("Missing actionType");

    // Normalized meta
    const meta = actionMeta || {};

    // Plugin Engine (shared global instance)
    const pluginEngine = this.app?.locals?.pluginEngine;

    // ------------------------------------------
    // 1) WASM ACTION  (wasm:<pluginId>:<action>)
    // ------------------------------------------
    if (actionType.startsWith("wasm:")) {
      if (!pluginEngine)
        throw new Error("Plugin engine missing for WASM action");

      const { registry } = pluginEngine;

      const [_, pluginId, ...rest] = actionType.split(":");
      const actionName = rest.join(":");

      const action = registry.getAction(pluginId, actionName);
      if (!action)
        throw new Error(`WASM action not registered: ${pluginId}::${actionName}`);

      const pluginEntry = pluginEngine.plugins[pluginId];
      const pluginDir =
        pluginEntry?.base ||
        pluginEntry?.root ||
        path.join(process.cwd(), "plugins", "actions", pluginId);

      const wasmFile = action.file;
      const exportName = action.fnName || action.export || "run";

      const result = await pluginEngine.wasmExecutor.run({
        pluginId,
        pluginDir,
        wasmFile,
        exportName,
        meta
      });

      await this.audit.automation("plugin.wasm.execute", {
        pluginId,
        actionName,
        meta,
        result
      });

      return result;
    }

    // ------------------------------------------
    // 2) JS PLUGIN ACTION (plugin:<pluginId>:<action>)
    // ------------------------------------------
    if (actionType.startsWith("plugin:")) {
      if (!pluginEngine)
        throw new Error("Plugin engine missing for JS plugin action");

      const { registry } = pluginEngine;

      const [_, pluginId, ...rest] = actionType.split(":");
      const actionName = rest.join(":");

      const action = registry.getAction(pluginId, actionName);
      if (!action)
        throw new Error(`Plugin action not registered: ${pluginId}::${actionName}`);

      const pluginEntry = pluginEngine.plugins[pluginId];
      const pluginDir =
        pluginEntry?.base ||
        pluginEntry?.root ||
        path.join(process.cwd(), "plugins", "actions", pluginId);

      const result = await pluginEngine.vmExecutor.run({
        pluginId,
        pluginDir,
        actionFile: action.file,
        fnName: action.fnName || "run",
        meta
      });

      await this.audit.automation("plugin.action.execute", {
        pluginId,
        actionName,
        meta,
        result
      });

      return result;
    }

    // ------------------------------------------
    // 3) BUILT-IN ACTIONS
    // ------------------------------------------
    return await this.runBuiltin({ id, taskId, actionType, actionMeta: meta });
  }

  /**
   * Built-in local actions (your defaults)
   */
  async runBuiltin({ id, taskId, actionType, actionMeta }) {
    this.logger.info(`Executing built-in action: ${actionType}`);

    // TODO: extend your built-ins here if needed

    await this.audit.automation("builtin.action.execute", {
      actionType,
      meta: actionMeta
    });

    return { ok: true };
  }
}

module.exports = ExecutorService;
