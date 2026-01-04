// src/modules/automation/services/executor.service.js
// FIXED: Proper app validation, error handling, audit logging

const path = require("path");

class ExecutorService {
  constructor({ prisma, logger, audit, app } = {}) {
    // ✅ FIXED: Validate app parameter
    if (!app) {
      throw new Error("ExecutorService requires { app } with pluginEngine");
    }
    if (!app.locals?.pluginEngine) {
      throw new Error("ExecutorService requires app.locals.pluginEngine to be initialized");
    }

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

    const meta = actionMeta || {};
    const { pluginEngine } = this.app.locals;

    // ------------------------------------------
    // 1) WASM ACTION (wasm:<pluginId>:<action>)
    // ------------------------------------------
    if (actionType.startsWith("wasm:")) {
      try {
        const [_, pluginId, ...rest] = actionType.split(":");
        const actionName = rest.join(":");

        const { registry, wasmExecutor, plugins } = pluginEngine;

        const action = registry.getAction(pluginId, actionName);
        if (!action) {
          const err = new Error(`WASM action not registered: ${pluginId}::${actionName}`);
          err.code = "ACTION_NOT_FOUND";
          throw err;
        }

        const pluginEntry = plugins[pluginId];
        const pluginDir =
          pluginEntry?.base ||
          pluginEntry?.root ||
          path.join(process.cwd(), "plugins", "actions", pluginId);

        const wasmFile = action.file || action.wasmFile;
        const exportName = action.fnName || action.export || "run";

        if (!wasmFile) {
          throw new Error("WASM file not specified for action");
        }

        const ctx = {
          meta,
          prisma: this.prisma,
          logger: this.logger,
          app: this.app,
          registry,
          pluginId,
          actionName
        };

        const result = await wasmExecutor.run({
          pluginId,
          pluginDir,
          wasmFile,
          exportName,
          ctx
        });

        // ✅ FIXED: Audit with error handling
        if (this.audit?.automation) {
          try {
            await this.audit.automation("plugin.wasm.execute", {
              pluginId,
              actionName,
              meta,
              result,
              success: true
            });
          } catch (auditErr) {
            this.logger.warn("Audit logging failed:", auditErr.message);
          }
        }

        return result;
      } catch (err) {
        // ✅ Log execution error
        if (this.audit?.automation) {
          try {
            await this.audit.automation("plugin.wasm.execute", {
              pluginId: actionType,
              success: false,
              error: err.message
            });
          } catch (auditErr) {
            this.logger.warn("Audit logging failed:", auditErr.message);
          }
        }
        throw err;
      }
    }

    // ------------------------------------------
    // 2) JS PLUGIN ACTION (plugin:<pluginId>:<action>)
    // ------------------------------------------
    if (actionType.startsWith("plugin:")) {
      try {
        const [_, pluginId, ...rest] = actionType.split(":");
        const actionName = rest.join(":");

        const { registry, vmExecutor, plugins } = pluginEngine;

        const action = registry.getAction(pluginId, actionName);
        if (!action) {
          const err = new Error(`Plugin action not registered: ${pluginId}::${actionName}`);
          err.code = "ACTION_NOT_FOUND";
          throw err;
        }

        const pluginEntry = plugins[pluginId];
        const pluginDir =
          pluginEntry?.base ||
          pluginEntry?.root ||
          path.join(process.cwd(), "plugins", "actions", pluginId);

        const ctx = {
          meta,
          prisma: this.prisma,
          logger: this.logger,
          app: this.app,
          registry,
          pluginId,
          actionName
        };

        const result = await vmExecutor.run({
          pluginId,
          pluginDir,
          actionFile: action.file,
          fnName: action.fnName || "run",
          ctx
        });

        // ✅ FIXED: Audit with error handling
        if (this.audit?.automation) {
          try {
            await this.audit.automation("plugin.action.execute", {
              pluginId,
              actionName,
              meta,
              result,
              success: true
            });
          } catch (auditErr) {
            this.logger.warn("Audit logging failed:", auditErr.message);
          }
        }

        return result;
      } catch (err) {
        // ✅ Log execution error
        if (this.audit?.automation) {
          try {
            await this.audit.automation("plugin.action.execute", {
              pluginId: actionType,
              success: false,
              error: err.message
            });
          } catch (auditErr) {
            this.logger.warn("Audit logging failed:", auditErr.message);
          }
        }
        throw err;
      }
    }

    // ------------------------------------------
    // 3) BUILT-IN ACTIONS
    // ------------------------------------------
    return await this.runBuiltin({ id, taskId, actionType, actionMeta: meta });
  }

  /**
   * Built-in local actions
   */
  async runBuiltin({ id, taskId, actionType, actionMeta }) {
    try {
      this.logger.info(`Executing built-in action: ${actionType}`);

      // TODO: extend your built-ins here if needed

      if (this.audit?.automation) {
        try {
          await this.audit.automation("builtin.action.execute", {
            actionType,
            meta: actionMeta,
            success: true
          });
        } catch (auditErr) {
          this.logger.warn("Audit logging failed:", auditErr.message);
        }
      }

      return { ok: true };
    } catch (err) {
      if (this.audit?.automation) {
        try {
          await this.audit.automation("builtin.action.execute", {
            actionType,
            success: false,
            error: err.message
          });
        } catch (auditErr) {
          this.logger.warn("Audit logging failed:", auditErr.message);
        }
      }
      throw err;
    }
  }
}

module.exports = ExecutorService;