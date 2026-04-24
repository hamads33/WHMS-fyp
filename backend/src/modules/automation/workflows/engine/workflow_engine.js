/**
 * Workflow Engine - FIXED VERSION
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
 *  - Proper task branching
 */

class WorkflowEngine {
  constructor(options = {}) {
    this.executor = options.executor;
    this.logger = options.logger || console;
    this.prisma = options.prisma;
    this.variableResolver = options.variableResolver;
    this.validator = options.validator;
    this.workflowDefinition = null;

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
      results: {},
    };

    try {
      this.logger.info(`Starting workflow execution: ${workflowId}`);

      this.workflowDefinition = definition;

      if (this.validator) {
        const validation = this.validator.validateWorkflow(definition);
        if (!validation.valid) {
          throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
        }
      }

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
   * Execute array of tasks sequentially
   * FIXED: Properly handles branching - doesn't execute next task after branch
   */
  async _executeTasks(tasks, context, options = {}, skipUntilTaskId = null) {
    const results = {};
    let shouldSkip = !!skipUntilTaskId;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      // Skip until we find the target task
      if (shouldSkip) {
        if (task.id === skipUntilTaskId) {
          shouldSkip = false;
        } else {
          continue;
        }
      }

      if (options.skipActions) {
        this.logger.info(`[DRY-RUN] Task: ${task.id}`);
        results[task.id] = { skipped: true };
        continue;
      }

      try {
        // Check skip condition
        if (task.skipIf) {
          const shouldSkipTask = this._evaluateCondition(task.skipIf, context);
          if (shouldSkipTask) {
            this.logger.info(`Skipping task: ${task.id}`);
            results[task.id] = { skipped: true };
            continue;
          }
        }

        // Handle condition branching - FIXED: Skip remaining tasks in this sequence
        if (task.type === "condition") {
          const condition = this._evaluateCondition(task.condition, context);
          const nextTaskId = condition ? task.onTrue : task.onFalse;

          results[task.id] = {
            type: "condition",
            condition: condition,
            selectedBranch: nextTaskId
          };

          if (nextTaskId) {
            const nextTask = this._findTask(nextTaskId);
            if (nextTask) {
              const branchResult = await this._executeTask(nextTask, context, options);
              results[nextTaskId] = branchResult;
              context.results[nextTaskId] = branchResult;
            } else {
              this.logger.warn(`Referenced task not found: ${nextTaskId}`);
            }
          }
          // Skip remaining tasks - branching is done
          break;
        }

        // Execute regular action task
        const result = await this._executeTask(task, context, options);
        results[task.id] = result;
        context.results[task.id] = result;

        // Handle parallel execution
        if (task.type === "parallel") {
          const parallelResults = await Promise.all(
            (task.parallel || []).map(taskId => {
              const parallelTask = this._findTask(taskId);
              return parallelTask
                ? this._executeTask(parallelTask, context, options)
                : Promise.resolve({ error: `Task not found: ${taskId}` });
            })
          );
          results[task.id] = { parallel: parallelResults };
        }

        // Handle loops
        if (task.type === "loop") {
          const items = this.variableResolver.resolve(task.items, context);
          const itemArray = Array.isArray(items) ? items : [items];

          const loopResults = [];
          for (let loopIndex = 0; loopIndex < itemArray.length; loopIndex++) {
            const item = itemArray[loopIndex];
            
            // FIXED: Create new variables object instead of spreading
            const loopContext = {
              workflow: context.workflow,
              input: context.input,
              variables: {
                ...context.variables,
                [task.itemName]: item,
                __loopIndex: loopIndex,
                __loopItem: item,
              },
              results: context.results,
            };

            const loopTaskResult = await this._executeTasks(
              task.tasks || [],
              loopContext,
              options
            );
            loopResults.push(loopTaskResult);
          }
          results[task.id] = loopResults;
        }
      } catch (error) {
        this.logger.error(`Task failed: ${task.id}`, error);

        // Handle error with retry
        if (task.onError?.retry) {
          const retryResult = await this._retryTask(task, context, options, error);
          results[task.id] = retryResult;
        } else if (task.onError?.fallback) {
          // Check for circular fallback
          if (this._hasCircularFallback(task, new Set())) {
            this.logger.error(`Circular fallback detected for task: ${task.id}`);
            results[task.id] = { error: `Circular fallback detected`, fallback: true };
          } else {
            const fallbackTask = this._findTask(task.onError.fallback);
            if (fallbackTask) {
              const fallbackResult = await this._executeTask(fallbackTask, context, options);
              results[task.id] = { fallback: fallbackResult };
            } else {
              this.logger.warn(`Fallback task not found: ${task.onError.fallback}`);
              results[task.id] = { error: error.message };
            }
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
   * Execute single task with timeout
   */
  async _executeTask(task, context, options = {}) {
    const taskTimeout = task.timeout || 30000;
    let timeoutHandle = null;

    try {
      return await Promise.race([
        this._executeTaskInternal(task, context, options),
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Task timeout: ${task.id} (${taskTimeout}ms)`));
          }, taskTimeout);
        }),
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  /**
   * Internal task execution with retries
   */
  async _executeTaskInternal(task, context, options = {}, attempt = 0) {
    try {
      const resolvedInput = this.variableResolver.resolve(task.input || {}, context);

      const result = await this.executor.execute(task.actionType || task.type, {
        taskId: task.id,
        ...task,
        input: resolvedInput, // must come after ...task so resolved values win
        context,
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

        this.logger.warn(
          `Retrying task ${task.id} after ${delayMs}ms (attempt ${attempt + 1}/${task.retry.times})`
        );

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
   * Find task by ID in workflow definition (IMPROVED)
   */
  _findTask(taskId) {
    if (!this.workflowDefinition || !this.workflowDefinition.tasks) {
      return null;
    }

    const traverse = (tasks) => {
      if (!Array.isArray(tasks)) return null;
      
      for (const task of tasks) {
        if (task.id === taskId) return task;
        
        // Search in nested tasks (loops, conditions)
        if (task.tasks && Array.isArray(task.tasks)) {
          const found = traverse(task.tasks);
          if (found) return found;
        }
        
        // Search in parallel tasks
        if (task.parallel && Array.isArray(task.parallel)) {
          for (const parallelTaskId of task.parallel) {
            const found = this._findTask(parallelTaskId);
            if (found) return found;
          }
        }
      }
      return null;
    };

    return traverse(this.workflowDefinition.tasks);
  }

  /**
   * Detect circular fallback chains
   */
  _hasCircularFallback(task, visited = new Set()) {
    if (!task.onError?.fallback) return false;

    const fallbackId = task.onError.fallback;

    if (visited.has(fallbackId)) {
      return true;
    }

    visited.add(task.id);
    const fallbackTask = this._findTask(fallbackId);

    if (!fallbackTask) return false;

    return this._hasCircularFallback(fallbackTask, visited);
  }

  /**
   * Evaluate conditional expression safely
   */
  _evaluateCondition(expression, context) {
    try {
      const resolved = this.variableResolver.resolve(expression, context);
      return Boolean(resolved) && resolved !== "false" && resolved !== 0;
    } catch (error) {
      this.logger.error(`Condition evaluation failed: ${expression}`, error);
      return false;
    }
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