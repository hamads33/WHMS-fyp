/**
 * Workflow Service
 * ============================================================
 * Business logic layer for workflow management
 * 
 * Handles:
 *  - Workflow CRUD operations
 *  - Workflow execution
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
   * List all workflows for a profile
   */
  async listWorkflows(profileId) {
    try {
      return await this.store.listWorkflows(profileId);
    } catch (error) {
      this.logger.error(`Error listing workflows for profile ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Get single workflow
   */
  async getWorkflow(workflowId) {
    try {
      return await this.store.getWorkflow(workflowId);
    } catch (error) {
      this.logger.error(`Error getting workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Create workflow
   */
  async createWorkflow(profileId, payload) {
    try {
      // Validate definition
      if (this.validator) {
        const validation = this.validator.validateWorkflow(payload.definition);
        if (!validation.valid) {
          throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
        }
      }

      // Create in database
      const workflow = await this.store.createWorkflow(profileId, {
        name: payload.name,
        description: payload.description,
        type: payload.type || "sequential",
        trigger: payload.trigger || "manual",
        definition: payload.definition,
        enabled: payload.enabled ?? true,
      });

      // Audit log
      if (this.audit) {
        await this.audit.log({
          action: "workflow_created",
          resourceType: "workflow",
          resourceId: workflow.id,
          meta: { profileId, name: workflow.name },
        });
      }

      return workflow;
    } catch (error) {
      this.logger.error(`Error creating workflow:`, error);
      throw error;
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(workflowId, payload) {
    try {
      // Validate if definition provided
      if (payload.definition && this.validator) {
        const validation = this.validator.validateWorkflow(payload.definition);
        if (!validation.valid) {
          throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
        }
      }

      // Update in database
      const workflow = await this.store.updateWorkflow(workflowId, payload);

      // Audit log
      if (this.audit) {
        await this.audit.log({
          action: "workflow_updated",
          resourceType: "workflow",
          resourceId: workflowId,
          meta: { changes: Object.keys(payload) },
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
  async deleteWorkflow(workflowId) {
    try {
      await this.store.deleteWorkflow(workflowId);

      // Audit log
      if (this.audit) {
        await this.audit.log({
          action: "workflow_deleted",
          resourceType: "workflow",
          resourceId: workflowId,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /* =====================================================
     WORKFLOW EXECUTION
  ===================================================== */

  /**
   * Execute workflow
   */
  async runWorkflow(workflowId, input = {}) {
    try {
      const workflow = await this.store.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      if (!workflow.enabled) {
        throw new Error(`Workflow is disabled: ${workflowId}`);
      }

      // Execute using engine
      const result = await this.engine.execute(
        workflowId,
        workflow.definition,
        input,
        { continueOnError: false }
      );

      // Record execution
      if (this.store.recordExecution) {
        await this.store.recordExecution(workflowId, result);
      }

      // Audit log
      if (this.audit) {
        await this.audit.log({
          action: "workflow_executed",
          resourceType: "workflow",
          resourceId: workflowId,
          meta: { status: result.status, duration: result.duration },
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Error running workflow ${workflowId}:`, error);
      
      // Audit failure
      if (this.audit) {
        await this.audit.log({
          action: "workflow_execution_failed",
          resourceType: "workflow",
          resourceId: workflowId,
          meta: { error: error.message },
          level: "error",
        });
      }

      throw error;
    }
  }

  /**
   * Dry run workflow (preview)
   */
  async dryRunWorkflow(workflowId, input = {}) {
    try {
      const workflow = await this.store.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Execute in dry-run mode
      const result = await this.engine.execute(
        `${workflowId}-dryrun`,
        workflow.definition,
        input,
        { skipActions: true, continueOnError: true }
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
  async getWorkflowHistory(workflowId, options = {}) {
    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      if (!this.store.getWorkflowHistory) {
        return { executions: [], total: 0 };
      }

      return await this.store.getWorkflowHistory(workflowId, { limit, offset });
    } catch (error) {
      this.logger.error(`Error getting workflow history ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow metrics
   */
  async getWorkflowMetrics(workflowId) {
    try {
      if (!this.store.getWorkflowMetrics) {
        return {
          totalRuns: 0,
          successCount: 0,
          failureCount: 0,
          avgDurationMs: 0,
        };
      }

      return await this.store.getWorkflowMetrics(workflowId);
    } catch (error) {
      this.logger.error(`Error getting workflow metrics ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow run details
   */
  async getWorkflowRun(runId) {
    try {
      if (!this.store.getWorkflowRun) {
        return null;
      }

      return await this.store.getWorkflowRun(runId);
    } catch (error) {
      this.logger.error(`Error getting workflow run ${runId}:`, error);
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
      return await this.store.updateWorkflow(workflowId, { enabled: true });
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
      return await this.store.updateWorkflow(workflowId, { enabled: false });
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
      const workflow = await this.store.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      return await this.store.createWorkflow(workflow.profileId, {
        name: newName || `${workflow.name} (Copy)`,
        description: `Clone of ${workflow.name}`,
        type: workflow.type,
        trigger: workflow.trigger,
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