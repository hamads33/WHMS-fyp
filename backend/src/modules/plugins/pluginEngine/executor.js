// src/modules/automation/services/executor.service.js
const path = require("path");

class ExecutorService {
  constructor({ prisma, logger, audit, app }) {
    this.prisma = prisma;
    this.logger = logger || console;
    this.audit = audit;
    this.app = app; // required
  }

  async run({ id, taskId, actionType, actionMeta }) {
    // ======================================================
    // WASM ACTIONS
    // ======================================================
    if (typeof actionType === "string" && actionType.startsWith("wasm:")) {
      const parts = actionType.split(":");
      if (parts.length < 3) {
        throw new Error("Invalid wasm actionType. Expected wasm:<pluginId>:<actionName>");
      }

      const pluginId = parts[1];
      const actionName = parts.slice(2).join(":");

      const pluginEngine = this.app?.locals?.pluginEngine;
      if (!pluginEngine) throw new Error("Plugin engine missing");

      const { registry, wasmExecutor, plugins } = pluginEngine;

      const action = registry.getAction(pluginId, actionName);
      if (!action) {
        throw new Error(`Plugin action not registered: ${pluginId}::${actionName}`);
      }

      const pluginEntry = plugins[pluginId];
      const pluginDir =
        pluginEntry?.base ||
        pluginEntry?.root ||
        path.join(process.cwd(), "plugins", "actions", pluginId);

      const wasmFile =
        action.file ||
        (action.meta && action.meta.file) ||
        action.wasmFile;

      const exportName = action.export || action.fnName || "run";

      if (!wasmFile) {
        throw new Error("WASM file not specified for action");
      }

      const ctx = {
        meta: actionMeta || {},
        prisma: this.prisma,
        logger: this.logger,
        app: this.app,
        registry,
        pluginId,
        actionName
      };

      // beforeAction hooks
      await this._fireHook("beforeAction", { pluginId, actionName, actionMeta });

      const result = await wasmExecutor.run({
        pluginId,
        pluginDir,
        wasmFile,
        exportName,
        ctx
      });

      // afterAction hooks
      await this._fireHook("afterAction", {
        pluginId,
        actionName,
        actionMeta,
        result
      });

      return result;
    }

    // ======================================================
    // JS PLUGIN ACTIONS
    // ======================================================
    if (typeof actionType === "string" && actionType.startsWith("plugin:")) {
      const parts = actionType.split(":");
      if (parts.length < 3) {
        throw new Error("Invalid plugin actionType. Expected plugin:<pluginId>:<actionName>");
      }

      const pluginId = parts[1];
      const actionName = parts.slice(2).join(":");

      const pluginEngine = this.app?.locals?.pluginEngine;
      if (!pluginEngine) throw new Error("Plugin engine missing");

      const { registry, vmExecutor, plugins } = pluginEngine;

      const action = registry.getAction(pluginId, actionName);
      if (!action) {
        throw new Error(`Plugin action not registered: ${pluginId}::${actionName}`);
      }

      const pluginEntry = plugins[pluginId];
      const pluginDir =
        pluginEntry?.base ||
        pluginEntry?.root ||
        path.join(process.cwd(), "plugins", "actions", pluginId);

      const ctx = {
        meta: actionMeta || {},
        prisma: this.prisma,
        logger: this.logger,
        app: this.app,
        registry,
        pluginId,
        actionName
      };

      // beforeAction hooks
      await this._fireHook("beforeAction", { pluginId, actionName, actionMeta });

      const result = await vmExecutor.run({
        pluginId,
        pluginDir,
        actionFile: action.file,
        fnName: action.fnName || null,
        ctx
      });

      // afterAction hooks
      await this._fireHook("afterAction", {
        pluginId,
        actionName,
        actionMeta,
        result
      });

      return result;
    }

    // ======================================================
    // BUILT-IN ACTIONS
    // ======================================================
    return this.runBuiltin({ id, taskId, actionType, actionMeta });
  }

  async runBuiltin({ id, taskId, actionType, actionMeta }) {
    this.logger.info(`Executing built-in action ${actionType}`);
    return { ok: true };
  }

  async _fireHook(eventName, payload) {
    try {
      const runHooks = require("../../plugins/hookRunner");
      await runHooks(eventName, payload, {
        app: this.app,
        prisma: this.prisma,
        logger: this.logger
      });
    } catch (e) {
      // Do not fail main execution due to hook failure
      this.logger?.warn?.(
        `Hook ${eventName} execution failure:`,
        e.message || e
      );
    }
  }
}

module.exports = ExecutorService;
