/**
 * Workflow Validator
 * ------------------------------------------------------------------
 * Validates workflow definitions against expected schema.
 */

const Ajv = require("ajv").default;
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// ============================================================
// ROUTE-LEVEL SCHEMAS (FOR validate() MIDDLEWARE)
// ============================================================

const workflowCreateSchema = {
  type: "object",
  required: ["name", "definition"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    definition: { type: "object" }
  }
};

const workflowUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    description: { type: "string" },
    definition: { type: "object" },
    enabled: { type: "boolean" }
  }
};

const workflowExecutionInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    input: { type: "object" }
  }
};

const dryRunSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    input: { type: "object" }
  }
};

const workflowValidateSchema = {
  type: "object",
  required: ["definition"],
  additionalProperties: false,
  properties: {
    definition: { type: "object" }
  }
};

// ============================================================
// INTERNAL WORKFLOW SCHEMA
// ============================================================

const workflowSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string", minLength: 1 },
    description: { type: "string" },
    version: { type: "integer", minimum: 1 },
    input: { $ref: "#/$defs/jsonSchema" },
    output: { $ref: "#/$defs/jsonSchema" },
    tasks: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/workflowTask" }
    },
    timeout: { type: "integer", minimum: 1000 },
    maxRetries: { type: "integer", minimum: 0 }
  },
  required: ["name", "tasks"],
  $defs: {
    jsonSchema: {
      type: ["object", "null"],
      properties: {},
      additionalProperties: true
    },
    workflowTask: {
      type: "object",
      required: ["id", "type"],
      additionalProperties: false,
      properties: {
        id: { type: "string", pattern: "^[a-zA-Z0-9_-]+$" },
        type: { enum: ["action", "condition", "loop", "parallel"] },
        description: { type: "string" },
        actionType: { type: "string" },
        input: { type: ["object", "null"], additionalProperties: true },
        condition: { type: "string" },
        onTrue: { type: "string" },
        onFalse: { type: "string" },
        items: { type: "string" },
        itemName: { type: "string" },
        tasks: {
          type: "array",
          items: { $ref: "#/$defs/workflowTask" }
        },
        parallel: { type: "array", items: { type: "string" } },
        skipIf: { type: "string" },
        retry: { $ref: "#/$defs/retryPolicy" },
        onError: { $ref: "#/$defs/errorHandler" },
        timeout: { type: "integer", minimum: 1000 }
      }
    },
    retryPolicy: {
      type: "object",
      required: ["times", "delayMs"],
      additionalProperties: false,
      properties: {
        times: { type: "integer", minimum: 1, maximum: 10 },
        delayMs: { type: "integer", minimum: 1000 },
        backoff: { enum: ["linear", "exponential"] },
        maxDelayMs: { type: "integer", minimum: 1000 }
      }
    },
    errorHandler: {
      type: "object",
      additionalProperties: false,
      properties: {
        retry: { $ref: "#/$defs/retryPolicy" },
        fallback: { type: "string" },
        notify: { type: "string" },
        timeout: { type: "integer", minimum: 1000 }
      }
    }
  }
};

// ============================================================
// VALIDATOR CLASS
// ============================================================

class WorkflowValidator {
  constructor() {
    this.validate = ajv.compile(workflowSchema);
  }

  validateWorkflow(definition) {
    const errors = [];

    if (!this.validate(definition)) {
      errors.push(...this._formatSchemaErrors(this.validate.errors));
      return { valid: false, errors };
    }

    const taskIds = this._extractTaskIds(definition.tasks);
    const duplicates = this._findDuplicates(taskIds);
    if (duplicates.length) {
      errors.push(`Duplicate task IDs: ${duplicates.join(", ")}`);
    }

    errors.push(
      ...this._validateTaskReferences(definition.tasks, taskIds),
      ...this._detectCycles(definition.tasks, taskIds),
      ...this._validateVariables(definition)
    );

    return { valid: errors.length === 0, errors };
  }

  _extractTaskIds(tasks) {
    const ids = [];
    const walk = list => {
      for (const t of list) {
        ids.push(t.id);
        if (t.tasks) walk(t.tasks);
      }
    };
    walk(tasks);
    return ids;
  }

  _findDuplicates(arr) {
    const seen = new Set();
    const dup = new Set();
    for (const v of arr) {
      if (seen.has(v)) dup.add(v);
      seen.add(v);
    }
    return [...dup];
  }

  _validateTaskReferences(tasks, ids) {
    const errors = [];
    const walk = list => {
      for (const t of list) {
        if (t.type === "condition") {
          if (t.onTrue && !ids.includes(t.onTrue))
            errors.push(`onTrue references missing task "${t.onTrue}"`);
          if (t.onFalse && !ids.includes(t.onFalse))
            errors.push(`onFalse references missing task "${t.onFalse}"`);
        }
        if (t.type === "parallel") {
          for (const r of t.parallel || []) {
            if (!ids.includes(r))
              errors.push(`parallel references missing task "${r}"`);
          }
        }
        if (t.onError?.fallback && !ids.includes(t.onError.fallback)) {
          errors.push(`fallback references missing task "${t.onError.fallback}"`);
        }
        if (t.tasks) walk(t.tasks);
      }
    };
    walk(tasks);
    return errors;
  }

  _detectCycles(tasks, ids) {
    const graph = {};
    for (const t of tasks) {
      graph[t.id] = [];
      if (t.onTrue) graph[t.id].push(t.onTrue);
      if (t.onFalse) graph[t.id].push(t.onFalse);
      if (t.parallel) graph[t.id].push(...t.parallel);
      if (t.onError?.fallback) graph[t.id].push(t.onError.fallback);
    }

    const visited = new Set();
    const stack = new Set();
    const errors = [];

    const dfs = n => {
      visited.add(n);
      stack.add(n);
      for (const k of graph[n] || []) {
        if (!visited.has(k) && dfs(k)) return true;
        if (stack.has(k)) return true;
      }
      stack.delete(n);
      return false;
    };

    for (const id of ids) {
      if (!visited.has(id) && dfs(id)) {
        errors.push(`Cyclic dependency detected at "${id}"`);
      }
    }
    return errors;
  }

  _validateVariables(definition) {
    const errors = [];
    const ids = this._extractTaskIds(definition.tasks);
    const re = /\$\{([^}]+)\}/g;

    const walk = obj => {
      if (!obj || typeof obj !== "object") return;
      for (const v of Object.values(obj)) {
        if (typeof v === "string") {
          let m;
          while ((m = re.exec(v))) {
            const src = m[1].split(".")[0];
            if (src !== "input" && !ids.includes(src)) {
              errors.push(`Invalid variable reference "${m[0]}"`);
            }
          }
        } else walk(v);
      }
    };

    walk(definition);
    return errors;
  }

  _formatSchemaErrors(errors = []) {
    return errors.map(e => `${e.instancePath || "/"} ${e.message}`);
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = WorkflowValidator;

module.exports.workflowCreateSchema = workflowCreateSchema;
module.exports.workflowUpdateSchema = workflowUpdateSchema;
module.exports.workflowExecutionInputSchema = workflowExecutionInputSchema;
module.exports.dryRunSchema = dryRunSchema;
module.exports.workflowValidateSchema = workflowValidateSchema;