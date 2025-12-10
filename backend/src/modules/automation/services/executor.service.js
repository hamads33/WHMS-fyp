const BuiltInActions = require("./builtInActions.service");

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
 */
class ExecutorService {
  constructor({ prisma, logger, audit, app }) {
    this.prisma = prisma;
    this.logger = logger;
    this.audit = audit;
    this.app = app;

    // Built-in system-level action handlers
    this.builtIns = new BuiltInActions({ logger, prisma });
  }

  /**
   * run()
   * ------------------------------------------------------------
   * Main entry point for executing an action.
   * Each `AutomationTask` maps to exactly 1 call of this method.
   *
   * @param {String} actionType  - e.g. "test_action" or "plugin:foo:doThing"
   * @param {Object} actionMeta  - JSON metadata for the action
   * ------------------------------------------------------------
   */
  async run({ actionType, actionMeta }) {
    if (!actionType) throw new Error("Invalid actionType");

    // ------------------------------------------------------------
    // 1) PLUGIN ACTION HANDLING
    // ------------------------------------------------------------
    // Format expected:
    //   plugin:<pluginId>:<actionName>
    //
    // Example:
    //   plugin:axios_ping:ping
    //
    // You can change this format later if needed.
    // ------------------------------------------------------------
    if (actionType.startsWith("plugin:")) {
      const parts = actionType.split(":");

      // Must be at least plugin:id:action
      if (parts.length < 3) {
        throw new Error("Invalid plugin actionType format (expected plugin:id:action)");
      }

      // Extract plugin identifiers
      const pluginId = parts[1];
      const actionName = parts.slice(2).join(":"); // supports nested actions

      // pluginEngine injected via app.locals inside app.js init()
      const pluginEngine = this.app?.locals?.pluginEngine;
      if (!pluginEngine) throw new Error("Plugin engine missing (check init order)");

      /**
       * The current code expects the pluginEngine API to expose:
       *
       *   pluginEngine.getAction(pluginId, actionName)
       *
       * If your plugin engine does NOT support this call yet,
       * you can modify ExecutorService OR update pluginEngine to match it.
       *
       * NOTE:
       *   We do NOT execute the returned "action" object directly.
       *   Actual execution is always done via:
       *       pluginEngine.runAction(...)
       *   OR
       *       pluginEngine.runFile(...)
       */
      const action = pluginEngine.getAction(pluginId, actionName);
      if (!action) {
        throw new Error(`Plugin action not registered: ${pluginId}::${actionName}`);
      }

      let result;

      /**
       * Execution fallback chain:
       * ------------------------------------------------
       * 1. If pluginEngine exposes runAction() → use it
       * 2. Else if pluginEngine exposes runFile() → use it
       * 3. Otherwise → plugin engine is not compatible
       * ------------------------------------------------
       */
      if (typeof pluginEngine.runAction === "function") {
        result = await pluginEngine.runAction(
          pluginId,
          actionName,
          actionMeta || {}
        );

      } else if (typeof pluginEngine.runFile === "function") {
        // runFile requires action.file + optional export function name
        result = await pluginEngine.runFile(
          action.file,
          action.fnName || null,
          actionMeta || {}
        );

      } else {
        throw new Error("Plugin engine missing runAction/runFile");
      }

      // ------------------------------------------------------------
      // AUDIT: plugin.action.execute
      // ------------------------------------------------------------
      await this.audit.automation("plugin.action.execute", {
        pluginId,
        actionName,
        meta: actionMeta,
        result,
      });

      return result;
    }

    // ------------------------------------------------------------
    // 2) BUILT-IN ACTION HANDLING
    // ------------------------------------------------------------
    //
    // If `actionType` directly matches a function in BuiltInActions,
    // we treat it as a built-in automation action.
    // ------------------------------------------------------------
    if (typeof this.builtIns[actionType] === "function") {
      const result = await this.builtIns[actionType](actionMeta || {});

      // AUDIT for built-in action execution
      await this.audit.automation("builtin.action.execute", {
        actionType,
        meta: actionMeta,
        result,
      });

      return result;
    }

    // ------------------------------------------------------------
    // 3) UNKNOWN ACTION → NO-OP
    // ------------------------------------------------------------
    //
    // Instead of throwing errors, WHMCS-like systems simply ignore
    // unknown actions so profiles continue executing next tasks.
    // ------------------------------------------------------------
    this.logger.warn(`Unknown built-in actionType: ${actionType}`);

    await this.audit.automation("action.noop", {
      actionType,
      meta: actionMeta,
    });

    return { ok: true, noOp: true };
  }
}

module.exports = ExecutorService;
