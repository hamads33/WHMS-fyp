/**
 * ExecutorService
 * ------------------------------------------------------------------
 * Core execution engine for automation actions.
 *
 * Supports:
 *  - Built-in system actions
 *  - Plugin-defined actions
 *  - Graceful fallback for unknown actions
 *
 * Why this abstraction exists:
 *  - Decouples automation logic from execution source
 *  - Allows marketplace plugins to hook into automation
 *
 * Execution Flow:
 *  Task → Executor → (Built-in | Plugin) → Result
 *
 * Important:
 *  - Used by workers, not HTTP controllers
 */

/**
 * ExecutorService
 * ------------------------------------------------------------
 * Responsible for executing ANY automation action:
 *   - Built-in actions (e.g., "test_action")
 *   - Plugin actions (plugin:<pluginId>:<actionName>)
 *   - No-op behavior for unknown action types
 *
 * This service is used by:
 *   - Workers (run-profile, run-task)
 *   - Test endpoints (POST /test-plugin-run)
 * ------------------------------------------------------------
 *//**
 * ExecutorService
 * ------------------------------------------------------------------
 * Core execution engine for automation actions.
 *
 * Supports:
 *  - Built-in system actions (via Action Registry)
 *  - Plugin-defined actions
 *  - Graceful fallback for unknown actions
 *
 * Execution Flow:
 *  Task → Executor → (Built-in | Plugin) → Result
 *
 * Important:
 *  - Used by workers, not HTTP controllers
 */

const ActionRegistry = require("../actions/registry");

class ExecutorService {
  constructor({ prisma, logger, audit, app }) {
    this.prisma = prisma;
    this.logger = logger;
    this.audit = audit;
    this.app = app;
  }

  /**
   * run()
   * ------------------------------------------------------------
   * Main entry point for executing a single automation task
   *
   * @param {String} actionType  - e.g. "http_request" or "plugin:backup:create"
   * @param {Object} actionMeta  - JSON metadata for the action
   * ------------------------------------------------------------
   */
  async run({ actionType, actionMeta }) {
    if (!actionType) {
      throw new Error("Invalid actionType");
    }

    const meta = actionMeta || {};
    const profileId = meta.profileId || null;

    /* ============================================================
       1) PLUGIN ACTION HANDLING
    ============================================================ */
    if (actionType.startsWith("plugin:")) {
      const parts = actionType.split(":");

      if (parts.length < 3) {
        throw new Error(
          "Invalid plugin actionType format (expected plugin:<id>:<action>)"
        );
      }

      const pluginId = parts[1];
      const actionName = parts.slice(2).join(":");

      const pluginEngine = this.app?.locals?.pluginEngine;
      if (!pluginEngine) {
        throw new Error("Plugin engine missing (check init order)");
      }

      const action = pluginEngine.getAction(pluginId, actionName);
      if (!action) {
        throw new Error(
          `Plugin action not registered: ${pluginId}::${actionName}`
        );
      }

      let result;

      if (typeof pluginEngine.runAction === "function") {
        result = await pluginEngine.runAction(
          pluginId,
          actionName,
          meta
        );
      } else if (typeof pluginEngine.runFile === "function") {
        result = await pluginEngine.runFile(
          action.file,
          action.fnName || null,
          meta
        );
      } else {
        throw new Error("Plugin engine missing runAction/runFile");
      }

      await this.audit.automation("plugin.action.execute", {
        profileId,
        pluginId,
        actionName,
        meta,
        result,
      });

      return result;
    }

    /* ============================================================
       2) BUILT-IN ACTION HANDLING (Registry-based)
    ============================================================ */
    const action = ActionRegistry.get(actionType);

    if (action && typeof action.execute === "function") {
      const result = await action.execute(meta, {
        prisma: this.prisma,
        logger: this.logger,
        audit: this.audit,
        app: this.app,
      });

      await this.audit.automation("builtin.action.execute", {
        profileId,
        actionType,
        meta,
        result,
      });

      return result;
    }

    /* ============================================================
       3) UNKNOWN ACTION → NO-OP (WHMCS behavior)
    ============================================================ */
    this.logger.warn(`Unknown automation action: ${actionType}`);

    await this.audit.automation("action.noop", {
      profileId,
      actionType,
      meta,
    });

    return { ok: true, noOp: true };
  }
}

module.exports = ExecutorService;
