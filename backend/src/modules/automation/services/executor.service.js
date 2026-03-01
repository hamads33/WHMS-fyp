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
       1) PLUGIN SERVICE ACTION HANDLING
       Format: "plugin:<serviceName>.<methodName>"
       Example: "plugin:paymentGateway.charge"
    ============================================================ */
    if (actionType.startsWith("plugin:")) {
      const descriptor = actionType.slice("plugin:".length); // e.g. "paymentGateway.charge"
      const dotIndex   = descriptor.lastIndexOf(".");

      if (dotIndex === -1) {
        throw new Error(
          `Invalid plugin actionType format. Expected "plugin:<serviceName>.<methodName>", got "${actionType}"`
        );
      }

      const serviceName = descriptor.slice(0, dotIndex);
      const methodName  = descriptor.slice(dotIndex + 1);

      const pluginManager = this.app?.locals?.pluginManager;
      if (!pluginManager) {
        throw new Error("Plugin system not initialized");
      }

      // Retrieve the named service from the container
      const serviceContainer = require("../../../core/plugin-system/service.container");
      const service = serviceContainer.get(serviceName);

      if (!service) {
        throw new Error(`Plugin service not found: "${serviceName}"`);
      }

      if (typeof service[methodName] !== "function") {
        throw new Error(`Plugin service "${serviceName}" has no method "${methodName}"`);
      }

      const result = await service[methodName](meta);

      await this.audit.automation("plugin.action.execute", {
        profileId,
        serviceName,
        methodName,
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

  /**
   * execute() — alias for run(), used by WorkflowEngine
   * Accepts (actionType, meta) and normalises the call
   */
  async execute(actionType, meta = {}) {
    // WorkflowEngine spreads the whole task into meta.
    // The http_request action reads top-level fields (url, method, body)
    // which are already present via ...task spread. Just delegate to run().
    return this.run(actionType, meta);
  }
}

module.exports = ExecutorService;
