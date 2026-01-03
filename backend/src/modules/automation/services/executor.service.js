/**
 * ExecutorService
 * ------------------------------------------------------------------
 * Core execution engine for automation actions.
 *
 * Supports:
 *  - Built-in system actions
 *  - Plugin-defined actions
 *  - Graceful error handling for unknown actions
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
   * ------------------------------------------------------------------
   * Main entry point for executing a single automation task
   *
   * @param {String} actionType  - e.g. "http_request" or "plugin:backup:create"
   * @param {Object} actionMeta  - JSON metadata for the action
   *
   * @throws {Error} If action type is invalid or execution fails
   * ------------------------------------------------------------------
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
        throw new Error("Plugin engine not initialized (check configuration)");
      }

      const action = pluginEngine.getAction(pluginId, actionName);
      if (!action) {
        throw new Error(
          `Plugin action not found: ${pluginId}::${actionName}`
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
        throw new Error("Plugin engine missing runAction/runFile methods");
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
       3) UNKNOWN ACTION → ERROR (don't silent-fail)
    ============================================================ */
    const error = new Error(`Unknown automation action: ${actionType}`);
    error.code = "unknown_action";

    this.logger.error(`Unknown action attempted: ${actionType}`);

    await this.audit.automation(
      "action.failed",
      {
        profileId,
        actionType,
        meta,
        reason: "Unknown action type"
      },
      "system",
      "ERROR"
    );

    throw error;
  }
}

module.exports = ExecutorService;