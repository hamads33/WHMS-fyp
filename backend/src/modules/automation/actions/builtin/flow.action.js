/**
 * Flow Control Actions
 * ------------------------------------------------------------------
 * Actions that control workflow execution behaviour — stopping,
 * transforming data, emitting events, and logging decisions.
 */

module.exports = [
  // ----------------------------------------------------------------
  // flow.stop
  // ----------------------------------------------------------------
  {
    name: "Stop Workflow",
    type: "builtin",
    actionType: "flow.stop",
    module: "flow",
    description: "Immediately halt workflow execution with an optional message",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", title: "Stop Message", description: "Reason logged for stopping" },
        condition: { type: "string", title: "Only stop if", description: 'Expression e.g. {{input.amount}} > 1000 — stops only when truthy' },
      },
    },
    async execute(meta, context) {
      const { logger } = context;
      const params = meta.input ?? meta;
      const { message = "Workflow stopped by flow.stop action", condition } = params;

      // If a condition expression is given, evaluate it
      if (condition) {
        try {
          // Simple safe eval via Function constructor (no external deps)
          // eslint-disable-next-line no-new-func
          const result = new Function(`return !!(${condition})`)();
          if (!result) {
            logger.info({ msg: "[flow.stop] Condition false — continuing", condition });
            return { success: true, stopped: false, reason: "condition was false" };
          }
        } catch (e) {
          throw new Error(`flow.stop condition evaluation failed: ${e.message}`);
        }
      }

      // Throw a special sentinel error that the engine should treat as a graceful stop
      const stopErr = new Error(`WORKFLOW_STOP: ${message}`);
      stopErr.isGracefulStop = true;
      throw stopErr;
    },
  },

  // ----------------------------------------------------------------
  // flow.transform
  // ----------------------------------------------------------------
  {
    name: "Transform / Map Data",
    type: "builtin",
    actionType: "flow.transform",
    module: "flow",
    description: "Build a new object from input fields to reshape data between steps",
    schema: {
      type: "object",
      required: ["mapping"],
      properties: {
        mapping: {
          type: "string",
          title: "Output Mapping (JSON)",
          description: 'JSON object where values are field paths, e.g. {"clientId":"{{input.userId}}","amount":"{{input.total}}"}',
        },
      },
    },
    async execute(meta, context) {
      const { logger } = context;
      const params = meta.input ?? meta;
      const { mapping } = params;

      if (!mapping) throw new Error("mapping is required");

      let map;
      try { map = typeof mapping === "string" ? JSON.parse(mapping) : mapping; }
      catch { throw new Error("mapping must be valid JSON"); }

      // The variable resolver in the engine will have already resolved {{tokens}}
      // at this point, so we just pass the mapping through as the output
      logger.info({ msg: "[flow.transform] Done", keys: Object.keys(map) });
      return { success: true, output: map };
    },
  },

  // ----------------------------------------------------------------
  // flow.set_variable
  // ----------------------------------------------------------------
  {
    name: "Set Variable",
    type: "builtin",
    actionType: "flow.set_variable",
    module: "flow",
    description: "Store a key-value pair in the workflow context for use in later steps",
    schema: {
      type: "object",
      required: ["key", "value"],
      properties: {
        key:   { type: "string", title: "Variable Name", description: 'Access in later steps as {{results.stepN.output.value}}' },
        value: { type: "string", title: "Value", description: "Can include {{variable}} tokens" },
      },
    },
    async execute(meta, context) {
      const { logger } = context;
      const params = meta.input ?? meta;
      const { key, value } = params;

      if (!key) throw new Error("key is required");

      logger.info({ msg: "[flow.set_variable] Set", key });
      return { success: true, key, value };
    },
  },

  // ----------------------------------------------------------------
  // flow.emit_event
  // ----------------------------------------------------------------
  {
    name: "Emit Custom Event",
    type: "builtin",
    actionType: "flow.emit_event",
    module: "flow",
    description: "Emit a system event that can trigger other workflows",
    schema: {
      type: "object",
      required: ["eventType"],
      properties: {
        eventType: { type: "string", title: "Event Type", description: "e.g. custom.invoice_escalated" },
        payload:   { type: "string", title: "Payload (JSON)", description: "JSON string to send as event payload" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger, app } = context;
      const params = meta.input ?? meta;
      const { eventType, payload: payloadStr } = params;

      if (!eventType) throw new Error("eventType is required");

      let payload = {};
      if (payloadStr) {
        try { payload = typeof payloadStr === "string" ? JSON.parse(payloadStr) : payloadStr; }
        catch { throw new Error("payload must be valid JSON"); }
      }

      // Emit via the app's eventEmitter if available
      const emitter = app?.locals?.eventEmitter || app?.get?.("eventEmitter");
      if (emitter?.emit) {
        await emitter.emit(eventType, payload);
      } else {
        // Fallback: record to audit log
        await prisma.auditLog.create({
          data: {
            source: "automation", action: eventType, actor: "automation",
            level: "INFO", entity: null, entityId: null, data: payload,
          },
        });
      }

      logger.info({ msg: "[flow.emit_event] Emitted", eventType });
      return { success: true, eventType, payload };
    },
  },

  // ----------------------------------------------------------------
  // flow.assert
  // ----------------------------------------------------------------
  {
    name: "Assert / Validate",
    type: "builtin",
    actionType: "flow.assert",
    module: "flow",
    description: "Throw an error and stop the workflow if a condition is not met",
    schema: {
      type: "object",
      required: ["condition", "message"],
      properties: {
        condition: { type: "string", title: "Condition", description: "JS expression that must be truthy, e.g. {{input.amount}} > 0" },
        message:   { type: "string", title: "Error Message", description: "Message logged/thrown when condition fails" },
      },
    },
    async execute(meta, context) {
      const { logger } = context;
      const params = meta.input ?? meta;
      const { condition, message } = params;

      if (!condition) throw new Error("condition is required");
      if (!message)   throw new Error("message is required");

      let passed = false;
      try {
        // eslint-disable-next-line no-new-func
        passed = !!new Function(`return !!(${condition})`)();
      } catch (e) {
        throw new Error(`flow.assert condition error: ${e.message}`);
      }

      if (!passed) {
        logger.warn({ msg: "[flow.assert] FAILED", condition, message });
        throw new Error(`Assertion failed: ${message}`);
      }

      logger.info({ msg: "[flow.assert] Passed", condition });
      return { success: true, passed: true, condition };
    },
  },
];
