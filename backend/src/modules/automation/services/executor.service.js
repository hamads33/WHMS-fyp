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
   */
  async run(actionTypeOrPayload, actionMeta) {
    let actionType;
    let meta;

    // Normalize call signature
    if (typeof actionTypeOrPayload === "string") {
      actionType = actionTypeOrPayload;
      meta = actionMeta || {};
    } else if (
      actionTypeOrPayload &&
      typeof actionTypeOrPayload === "object"
    ) {
      actionType = actionTypeOrPayload.actionType;
      meta = actionTypeOrPayload.actionMeta || {};
    } else {
      throw new Error("Invalid arguments to executor.run()");
    }

    if (!actionType) {
      throw new Error("Invalid actionType");
    }

    const profileId = meta.profileId || null;

    /* ============================================================
       🔒 BACKWARD COMPATIBILITY NORMALIZATION (CRITICAL)
       Handles legacy tasks created before canonical keys existed
    ============================================================ */
    const LEGACY_ACTION_MAP = {
      "HTTP Request": "http_request",
    };

    if (LEGACY_ACTION_MAP[actionType]) {
      this.logger.warn({
        msg: "[automation] Normalizing legacy actionType",
        from: actionType,
        to: LEGACY_ACTION_MAP[actionType],
      });

      actionType = LEGACY_ACTION_MAP[actionType];
    }

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
        throw new Error("Plugin engine not initialized");
      }

      const action = pluginEngine.getAction(pluginId, actionName);
      if (!action) {
        throw new Error(
          `Plugin action not found: ${pluginId}::${actionName}`
        );
      }

      let result;

      if (typeof pluginEngine.runAction === "function") {
        result = await pluginEngine.runAction(pluginId, actionName, meta);
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
       2) BUILT-IN ACTION HANDLING
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
       3) UNKNOWN ACTION → HARD FAIL
    ============================================================ */
    const error = new Error(`Unknown automation action: ${actionType}`);
    error.code = "unknown_action";

    this.logger.error({
      msg: "[automation] Unknown action attempted",
      actionType,
      meta,
    });

    await this.audit.automation(
      "action.failed",
      {
        profileId,
        actionType,
        meta,
        reason: "Unknown action type",
      },
      "system",
      "ERROR"
    );

    throw error;
  }
}

module.exports = ExecutorService;
