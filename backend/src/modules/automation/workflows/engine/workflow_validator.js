/**
 * Workflow Validator
 * ------------------------------------------------------------------
 * Validates workflow definitions against expected schema.
 *
 * Responsibilities:
 *  - Validate workflow structure
 *  - Check for cyclic dependencies
 *  - Validate task references
 *  - Type checking
 *
 * Why this matters:
 *  - Catch errors before execution
 *  - Provide clear validation messages
 *  - Prevent infinite loops
 */

const Ajv = require("ajv").default;
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// ============================================================
// JSON SCHEMAS
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
      type: ["object", "null"]
    },
    workflowTask: {
      type: "object",
      properties: {
        id: { type: "string", pattern: "^[a-zA-Z0-9_-]+$" },
        type: { enum: ["action", "condition", "loop", "parallel"] },
        description: { type: "string" },
        
        // Action task
        actionType: { type: "string" },
        input: { type: ["object", "null"] },
        
        // Condition task
        condition: { type: "string" },
        onTrue: { type: "string" },
        onFalse: { type: "string" },
        
        // Loop task
        items: { type: "string" },
        itemName: { type: "string" },
        tasks: {
          type: "array",
          items: { $ref: "#/$defs/workflowTask" }
        },
        
        // Parallel task
        parallel: {
          type: "array",
          items: { type: "string" }
        },
        
        // Common properties
        skipIf: { type: "string" },
        retry: { $ref: "#/$defs/retryPolicy" },
        onError: { $ref: "#/$defs/errorHandler" },
        timeout: { type: "integer", minimum: 1000 }
      },
      required: ["id", "type"],
      additionalProperties: false
    },
    retryPolicy: {
      type: "object",
      properties: {
        times: { type: "integer", minimum: 1, maximum: 10 },
        delayMs: { type: "integer", minimum: 1000 },
        backoff: { enum: ["linear", "exponential"] },
        maxDelayMs: { type: "integer", minimum: 1000 }
      },
      required: ["times", "delayMs"],
      additionalProperties: false
    },
    errorHandler: {
      type: "object",
      properties: {
        retry: { $ref: "#/$defs/retryPolicy" },
        fallback: { type: "string" },
        notify: { type: "string" },
        timeout: { type: "integer", minimum: 1000 }
      },
      additionalProperties: false
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

  /**
   * Validate complete workflow definition
   */
  validateWorkflow(definition) {
    const errors = [];

    // 1. JSON Schema validation
    if (!this.validate(definition)) {
      errors.push(...this._formatSchemaErrors(this.validate.errors));
      return { valid: false, errors };
    }

    // 2. Check for duplicate task IDs
    const taskIds = this._extractTaskIds(definition.tasks);
    const duplicates = this._findDuplicates(taskIds);
    if (duplicates.length > 0) {
      errors.push(`Duplicate task IDs: ${duplicates.join(", ")}`);
    }

    // 3. Validate task references
    const refErrors = this._validateTaskReferences(definition.tasks, taskIds);
    errors.push(...refErrors);

    // 4. Check for cyclic dependencies
    const cycleErrors = this._detectCycles(definition.tasks, taskIds);
    errors.push(...cycleErrors);

    // 5. Validate variable interpolations
    const varErrors = this._validateVariables(definition);
    errors.push(...varErrors);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract all task IDs recursively
   */
  _extractTaskIds(tasks) {
    const ids = [];
    const traverse = (taskList) => {
      for (const task of taskList) {
        ids.push(task.id);
        if (task.tasks) traverse(task.tasks); // Loop tasks
      }
    };
    traverse(tasks);
    return ids;
  }

  /**
   * Find duplicate values in array
   */
  _findDuplicates(arr) {
    const seen = new Set();
    const dups = new Set();
    for (const item of arr) {
      if (seen.has(item)) dups.add(item);
      seen.add(item);
    }
    return Array.from(dups);
  }

  /**
   * Validate that all referenced tasks exist
   */
  _validateTaskReferences(tasks, allTaskIds, parentPath = "") {
    const errors = [];

    const validate = (taskList, path) => {
      for (const task of taskList) {
        const taskPath = path ? `${path}.${task.id}` : task.id;

        // Check onTrue/onFalse references
        if (task.type === "condition") {
          if (task.onTrue && !allTaskIds.includes(task.onTrue)) {
            errors.push(`Task ${taskPath}: onTrue references non-existent task "${task.onTrue}"`);
          }
          if (task.onFalse && !allTaskIds.includes(task.onFalse)) {
            errors.push(`Task ${taskPath}: onFalse references non-existent task "${task.onFalse}"`);
          }
        }

        // Check parallel references
        if (task.type === "parallel") {
          for (const ref of task.parallel || []) {
            if (!allTaskIds.includes(ref)) {
              errors.push(`Task ${taskPath}: parallel references non-existent task "${ref}"`);
            }
          }
        }

        // Check error fallback
        if (task.onError?.fallback && !allTaskIds.includes(task.onError.fallback)) {
          errors.push(`Task ${taskPath}: onError.fallback references non-existent task "${task.onError.fallback}"`);
        }

        // Recurse into loop tasks
        if (task.tasks) {
          validate(task.tasks, taskPath);
        }
      }
    };

    validate(tasks, parentPath);
    return errors;
  }

  /**
   * Detect cyclic dependencies
   */
  _detectCycles(tasks, allTaskIds) {
    const errors = [];
    const visited = new Set();
    const recursionStack = new Set();

    const buildGraph = (taskList) => {
      const graph = {};
      for (const task of taskList) {
        graph[task.id] = [];

        if (task.type === "condition") {
          if (task.onTrue) graph[task.id].push(task.onTrue);
          if (task.onFalse) graph[task.id].push(task.onFalse);
        } else if (task.type === "parallel") {
          graph[task.id].push(...(task.parallel || []));
        }

        if (task.onError?.fallback) {
          graph[task.id].push(task.onError.fallback);
        }
      }
      return graph;
    };

    const graph = buildGraph(tasks);

    const hasCycle = (node, stack) => {
      visited.add(node);
      stack.add(node);

      for (const neighbor of graph[node] || []) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor, stack)) return true;
        } else if (stack.has(neighbor)) {
          return true;
        }
      }

      stack.delete(node);
      return false;
    };

    for (const taskId of allTaskIds) {
      if (!visited.has(taskId)) {
        if (hasCycle(taskId, new Set())) {
          errors.push(`Cyclic dependency detected involving task "${taskId}"`);
        }
      }
    }

    return errors;
  }

  /**
   * Validate variable interpolations
   */
  _validateVariables(definition) {
    const errors = [];

    const validateExpression = (expr, taskIds) => {
      if (typeof expr !== "string") return;

      // Find all ${...} expressions
      const varRegex = /\$\{([^}]+)\}/g;
      let match;

      while ((match = varRegex.exec(expr)) !== null) {
        const ref = match[1];

        // Parse: taskId.output.field or input.field
        const parts = ref.split(".");
        const source = parts[0]; // "taskId" or "input"

        if (source !== "input" && !taskIds.includes(source)) {
          errors.push(`Variable reference "$${match[0]}" references non-existent task "${source}"`);
        }
      }
    };

    const walkTasks = (tasks, taskIds) => {
      for (const task of tasks) {
        // Validate input variables
        if (task.input && typeof task.input === "object") {
          const validateObj = (obj) => {
            for (const value of Object.values(obj)) {
              if (typeof value === "string") {
                validateExpression(value, taskIds);
              } else if (typeof value === "object") {
                validateObj(value);
              }
            }
          };
          validateObj(task.input);
        }

        // Validate condition
        if (task.condition) {
          validateExpression(task.condition, taskIds);
        }

        // Validate skipIf
        if (task.skipIf) {
          validateExpression(task.skipIf, taskIds);
        }

        // Recurse
        if (task.tasks) {
          walkTasks(task.tasks, taskIds);
        }
      }
    };

    const taskIds = this._extractTaskIds(definition.tasks);
    walkTasks(definition.tasks, taskIds);

    return errors;
  }

  /**
   * Format AJV validation errors
   */
  _formatSchemaErrors(errors) {
    return errors.map(err => {
      const path = err.instancePath || "/";
      const message = err.message || "Invalid";
      return `${path}: ${message}`;
    });
  }
}

module.exports = WorkflowValidator;