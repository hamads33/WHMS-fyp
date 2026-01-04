/**
 * Workflow Service
 * ============================================================
 * Business logic layer for workflow management
 *
 * Handles:
 *  - Workflow CRUD operations
 *  - Workflow execution with transactions
 *  - Workflow validation
 *  - Execution history
 *  - Metrics & monitoring
 */

class WorkflowService {
  constructor(options = {}) {
    this.prisma = options.prisma;
    this.logger = options.logger || console;
    this.audit = options.audit;
    this.store = options.store;
    this.executor = options.executor;
    this.validator = options.validator;
    this.engine = options.engine;

    if (!this.prisma) {
      throw new Error("WorkflowService requires prisma");
    }
    if (!this.engine) {
      throw new Error("WorkflowService requires engine");
    }
  }

  /* =====================================================
     WORKFLOW CRUD
  ===================================================== */

  /**
   * List all workflows
   */
  async listAll() {
    try {
      return await this.store.listAll();
    } catch (error) {
      this.logger.error("Error listing workflows:", error);
      throw error;
    }
  }

  /**
   * Get single workflow
   */
  async getById(workflowId) {
    try {
      return await this.store.getById(workflowId);
    } catch (error) {
      this.logger.error(`Error getting workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Create workflow
   */
  async create(payload) {
    try {
      // Validate definition
      if (this.validator) {
        const validation = this.validator.validateWorkflow(payload.definition);
        if (!validation.valid) {
          throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
        }
      }

      // Create in database
      const workflow = await this.store.create({
        name: payload.name,
        description: payload.description,
        definition: payload.definition,
        enabled: payload.enabled ?? true,
      });

      // Audit log
      if (this.audit) {
        await this.audit.system("workflow_created", {
          entity: "AutomationWorkflow",
          entityId: workflow.id,
          data: {
            name: workflow.name
          },
        });
      }

      return workflow;
    } catch (error) {
      this.logger.error("Error creating workflow:", error);
      throw error;
    }
  }

  /**
   * Update workflow
   */
  async update(workflowId, payload) {
    try {
      // Validate if definition provided
      if (payload.definition && this.validator) {
        const validation = this.validator.validateWorkflow(payload.definition);
        if (!validation.valid) {
          throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
        }
      }

      // Update in database
      const workflow = await this.store.update(workflowId, payload);

      // Audit log
      if (this.audit) {
        await this.audit.system("workflow_updated", {
          entity: "AutomationWorkflow",
          entityId: workflowId,
          data: {
            changes: Object.keys(payload)
          },
        });
      }

      return workflow;
    } catch (error) {
      this.logger.error(`Error updating workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async delete(workflowId) {
    try {
      await this.store.delete(workflowId);

      // Audit log
      if (this.audit) {
        await this.audit.system("workflow_deleted", {
          entity: "AutomationWorkflow",
          entityId: workflowId,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /* =====================================================
     WORKFLOW EXECUTION - WITH TRANSACTION SUPPORT
  ===================================================== */

  /**
   * Execute workflow with transaction for data consistency
   */
  async executeWorkflow(workflowId, input = {}) {
    let run = null;

    try {
      const workflow = await this.store.getByIdSimple(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      if (!workflow.enabled) {
        throw new Error(`Workflow is disabled: ${workflowId}`);
      }

      // Execute within transaction
      run = await this.store.executeWorkflowTransaction(
        workflowId,
        input,
        async (runId) => {
          // Execute using engine
          const result = await this.engine.execute(
            workflowId,
            workflow.definition,
            input,
            { continueOnError: false }
          );

          return {
            status: result.status,
            output: result.output,
            error: result.error,
            duration: result.duration,
            successCount: result.context?.successCount || 0,
            failureCount: result.context?.failureCount || 0,
            taskCount: workflow.definition.tasks?.length || 0,
            skippedCount: 0,
          };
        }
      );

      // Audit log
      if (this.audit) {
        await this.audit.automation("workflow.executed", {
          runId: run.id,
          status: run.status,
          duration: run.totalDuration,
          workflowId
        });
      }

      return run;
    } catch (error) {
      this.logger.error(`Error running workflow ${workflowId}:`, error);

      // Audit failure
      if (this.audit) {
        await this.audit.automation("workflow.execution_failed", {
          error: error.message,
          runId: run?.id,
          workflowId
        }, "system", "ERROR");
      }

      throw error;
    }
  }

  /**
   * Dry run workflow (preview without side effects)
   */
  async dryRunWorkflow(workflowId, input = {}) {
    try {
      const workflow = await this.store.getByIdSimple(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Execute in dry-run mode (no side effects)
      const result = await this.engine.dryRun(
        workflow.definition,
        input
      );

      return result;
    } catch (error) {
      this.logger.error(`Error dry-running workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /* =====================================================
     VALIDATION & METRICS
  ===================================================== */

  /**
   * Validate workflow definition
   */
  async validateWorkflow(definition) {
    if (!this.validator) {
      throw new Error("Validator not available");
    }

    return this.validator.validateWorkflow(definition);
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(workflowId, limit = 50, offset = 0) {
    try {
      const runs = await this.store.listRuns(workflowId, limit, offset);
      const total = await this.store.countRuns(workflowId);

      return {
        runs,
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Error getting workflow history ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get execution details
   */
  async getExecutionDetails(runId) {
    try {
      return await this.store.getRun(runId);
    } catch (error) {
      this.logger.error(`Error getting execution details ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow metrics
   */
  async getMetrics(workflowId) {
    try {
      return await this.store.getMetrics(workflowId);
    } catch (error) {
      this.logger.error(`Error getting workflow metrics ${workflowId}:`, error);
      throw error;
    }
  }

  /* =====================================================
     UTILITIES
  ===================================================== */

  /**
   * Enable workflow
   */
  async enableWorkflow(workflowId) {
    try {
      return await this.store.setEnabled(workflowId, true);
    } catch (error) {
      this.logger.error(`Error enabling workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Disable workflow
   */
  async disableWorkflow(workflowId) {
    try {
      return await this.store.setEnabled(workflowId, false);
    } catch (error) {
      this.logger.error(`Error disabling workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Clone workflow
   */
  async cloneWorkflow(workflowId, newName) {
    try {
      const workflow = await this.store.getByIdSimple(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      return await this.store.create({
        name: newName || `${workflow.name} (Copy)`,
        description: `Clone of ${workflow.name}`,
        definition: workflow.definition,
        enabled: false, // Clone is disabled by default
      });
    } catch (error) {
      this.logger.error(`Error cloning workflow ${workflowId}:`, error);
      throw error;
    }
  }
}

module.exports = WorkflowService;