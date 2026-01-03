/**
 * Workflow Engine
 * ============================================================
 * Core execution engine for enterprise workflows
 * 
 * Handles:
 *  - Task execution
 *  - Variable resolution
 *  - Conditional logic
 *  - Parallel execution
 *  - Error handling & retries
 *  - Timeout management
 */

class WorkflowEngine {
  constructor(options = {}) {
    this.executor = options.executor;
    this.logger = options.logger || console;
    this.prisma = options.prisma;
    this.variableResolver = options.variableResolver; // ✅ Accept instance, not class
    this.validator = options.validator;
    
    if (!this.executor) {
      throw new Error("WorkflowEngine requires executor");
    }
    if (!this.variableResolver) {
      throw new Error("WorkflowEngine requires variableResolver instance");
    }
  }

  /**
   * Execute workflow definition
   */
  async execute(workflowId, definition, input = {}, options = {}) {
    const startTime = Date.now();
    const context = {
      workflow: { id: workflowId },
      input,
      variables: options.variables || {},
      results: {}, // Store task results
    };

    try {
      this.logger.info(`Starting workflow execution: ${workflowId}`);

      // Validate definition
      if (this.validator) {
        const validation = this.validator.validateWorkflow(definition);
        if (!validation.valid) {
          throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
        }
      }

      // Execute tasks
      const result = await this._executeTasks(
        definition.tasks,
        context,
        options
      );

      const duration = Date.now() - startTime;

      this.logger.info(`Workflow completed successfully: ${workflowId} (${duration}ms)`);

      return {
        status: "success",
        output: result,
        context,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Workflow failed: ${workflowId}`, error);

      return {
        status: "failed",
        error: error.message,
        context,
        duration,
      };
    }
  }

  /**
   * Execute array of tasks sequentially or in parallel
   */
  async _executeTasks(tasks, context, options = {}) {
    const results = {};

    for (const task of tasks) {
      if (options.skipActions) {
        // Dry-run mode: skip actual action execution
        this.logger.info(`[DRY-RUN] Task: ${task.id}`);
        results[task.id] = { skipped: true };
        continue;
      }

      try {
        // Check skip condition
        if (task.skipIf) {
          const shouldSkip = this._evaluateCondition(task.skipIf, context);
          if (shouldSkip) {
            this.logger.info(`Skipping task: ${task.id}`);
            results[task.id] = { skipped: true };
            continue;
          }
        }

        // Execute task
        const result = await this._executeTask(task, context, options);
        results[task.id] = result;
        context.results[task.id] = result;

        // Handle condition branching
        if (task.type === "condition") {
          const condition = this._evaluateCondition(task.condition, context);
          const nextTaskId = condition ? task.onTrue : task.onFalse;

          if (nextTaskId) {
            const nextTask = this._findTask(nextTaskId, context);
            if (nextTask) {
              const branchResult = await this._executeTask(nextTask, context, options);
              results[nextTaskId] = branchResult;
              context.results[nextTaskId] = branchResult;
            }
          }
        }

        // Handle parallel execution
        if (task.type === "parallel") {
          const parallelResults = await Promise.all(
            (task.parallel || []).map(taskId =>
              this._findTask(taskId, context)
                ? this._executeTask(this._findTask(taskId, context), context, options)
                : Promise.resolve({ error: `Task not found: ${taskId}` })
            )
          );
          results[task.id] = { parallel: parallelResults };
        }

        // Handle loops
        if (task.type === "loop") {
          const items = this.variableResolver.resolve(task.items, context);
          const itemArray = Array.isArray(items) ? items : [items];

          for (const item of itemArray) {
            const loopContext = {
              ...context,
              [task.itemName]: item,
            };
            const loopResult = await this._executeTasks(task.tasks || [], loopContext, options);
            if (!results[task.id]) results[task.id] = [];
            results[task.id].push(loopResult);
          }
        }
      } catch (error) {
        this.logger.error(`Task failed: ${task.id}`, error);

        // Handle error with retry
        if (task.onError?.retry) {
          const retryResult = await this._retryTask(task, context, options, error);
          results[task.id] = retryResult;
        } else if (task.onError?.fallback) {
          const fallbackTask = this._findTask(task.onError.fallback, context);
          if (fallbackTask) {
            const fallbackResult = await this._executeTask(fallbackTask, context, options);
            results[task.id] = { fallback: fallbackResult };
          }
        } else {
          results[task.id] = { error: error.message };
          if (!options.continueOnError) {
            throw error;
          }
        }
      }
    }

    return results;
  }

  /**
   * Execute single task
   */
  async _executeTask(task, context, options = {}) {
    const taskTimeout = task.timeout || 30000;

    return Promise.race([
      this._executeTaskInternal(task, context, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Task timeout: ${task.id}`)), taskTimeout)
      ),
    ]);
  }

  /**
   * Internal task execution with retries
   */
  async _executeTaskInternal(task, context, options = {}, attempt = 0) {
    try {
      // Resolve input variables
      const resolvedInput = this.variableResolver.resolve(task.input || {}, context);

      // Execute action
      const result = await this.executor.execute(task.actionType || task.type, {
        taskId: task.id,
        input: resolvedInput,
        context,
        ...task,
      });

      return {
        status: "success",
        output: result,
        attempt,
      };
    } catch (error) {
      // Check retry policy
      if (task.retry && attempt < task.retry.times) {
        const delayMs = this._calculateDelay(
          task.retry.delayMs,
          attempt,
          task.retry.backoff
        );

        this.logger.warn(`Retrying task ${task.id} after ${delayMs}ms (attempt ${attempt + 1})`);

        await new Promise(resolve => setTimeout(resolve, delayMs));

        return this._executeTaskInternal(task, context, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Retry task with backoff
   */
  async _retryTask(task, context, options, error) {
    const retry = task.onError.retry;
    const maxAttempts = retry?.times || 3;
    const baseDelay = retry?.delayMs || 1000;
    const backoff = retry?.backoff || "linear";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const delay = this._calculateDelay(baseDelay, attempt - 1, backoff);
        await new Promise(resolve => setTimeout(resolve, delay));

        this.logger.info(`Retrying task: ${task.id} (attempt ${attempt}/${maxAttempts})`);

        return await this._executeTaskInternal(task, context, options, attempt);
      } catch (retryError) {
        if (attempt === maxAttempts) {
          throw retryError;
        }
      }
    }
  }

  /**
   * Calculate retry delay with backoff
   */
  _calculateDelay(baseDelayMs, attemptNumber, backoff = "linear") {
    switch (backoff) {
      case "exponential":
        return baseDelayMs * Math.pow(2, attemptNumber);
      case "linear":
      default:
        return baseDelayMs * (attemptNumber + 1);
    }
  }

  /**
   * Evaluate conditional expression
   */
  _evaluateCondition(expression, context) {
    try {
      // Resolve variables in expression
      const resolved = this.variableResolver.resolve(expression, context);

      // Evaluate as boolean
      return Boolean(resolved) && resolved !== "false" && resolved !== 0;
    } catch (error) {
      this.logger.error(`Condition evaluation failed: ${expression}`, error);
      return false;
    }
  }

  /**
   * Find task by ID
   */
  _findTask(taskId, context) {
    // This would typically search through the workflow definition
    // For now, return null (implement based on your needs)
    return null;
  }

  /**
   * Dry-run execution (preview without side effects)
   */
  async dryRun(definition, input = {}) {
    return this.execute("dry-run", definition, input, {
      skipActions: true,
      continueOnError: true,
    });
  }

  /**
   * Validate only (no execution)
   */
  validateOnly(definition) {
    if (!this.validator) {
      throw new Error("Validator not available");
    }
    return this.validator.validateWorkflow(definition);
  }
}

module.exports = WorkflowEngine;