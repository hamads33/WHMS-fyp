/**
 * Workflow Controller
 * ------------------------------------------------------------------
 * REST API endpoints for workflow management.
 *
 * Routes:
 *  GET    /workflows              - List workflows
 *  POST   /workflows              - Create workflow
 *  GET    /workflows/:id          - Get workflow
 *  PUT    /workflows/:id          - Update workflow
 *  DELETE /workflows/:id          - Delete workflow
 *  POST   /workflows/:id/run      - Execute workflow
 *  POST   /workflows/:id/dry-run  - Preview execution
 *  GET    /workflows/:id/history  - Execution history
 *  GET    /workflows/:id/metrics  - Performance metrics
 */

class WorkflowController {
  constructor({ workflowService, logger, audit }) {
    this.workflowService = workflowService;
    this.logger = logger || console;
    this.audit = audit;
  }

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  /**
   * List all workflows
   * GET /api/workflows
   */
  async list(req, res) {
    try {
      const workflows = await this.workflowService.listAll();
      return res.success(workflows);
    } catch (err) {
      this.logger.error("Failed to list workflows:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Create workflow
   * POST /api/workflows
   */
  async create(req, res) {
    try {
      const { name, description, definition } = req.body;

      if (!definition) {
        return res.fail("Workflow definition is required", 400);
      }

      const workflow = await this.workflowService.create({
        name,
        description,
        definition
      });

      await this.audit.system("workflow.created", {
        userId: req.auditContext?.userId || null,
        entity: "AutomationWorkflow",
        entityId: workflow.id,
        ip: req.auditContext?.ip || null,
        userAgent: req.auditContext?.userAgent || null,
        data: { id: workflow.id, name: workflow.name }
      });

      return res.success(workflow, {}, 201);
    } catch (err) {
      this.logger.error("Failed to create workflow:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Get single workflow
   * GET /api/workflows/:workflowId
   */
  async get(req, res) {
    try {
      const workflowId = Number(req.params.workflowId);
      const workflow = await this.workflowService.getById(workflowId);

      if (!workflow) {
        return res.fail("Workflow not found", 404);
      }

      return res.success(workflow);
    } catch (err) {
      this.logger.error("Failed to get workflow:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Update workflow
   * PUT /api/workflows/:workflowId
   */
  async update(req, res) {
    try {
      const workflowId = Number(req.params.workflowId);
      const { name, description, definition, enabled } = req.body;

      const workflow = await this.workflowService.update(workflowId, {
        name,
        description,
        definition,
        enabled
      });

      await this.audit.system("workflow.updated", {
        userId: req.auditContext?.userId || null,
        entity: "AutomationWorkflow",
        entityId: workflowId,
        ip: req.auditContext?.ip || null,
        userAgent: req.auditContext?.userAgent || null
      });

      return res.success(workflow);
    } catch (err) {
      this.logger.error("Failed to update workflow:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Delete workflow
   * DELETE /api/workflows/:workflowId
   */
  async delete(req, res) {
    try {
      const workflowId = Number(req.params.workflowId);

      await this.workflowService.delete(workflowId);

      await this.audit.system("workflow.deleted", {
        userId: req.auditContext?.userId || null,
        entity: "AutomationWorkflow",
        entityId: workflowId,
        ip: req.auditContext?.ip || null
      });

      return res.success({ deleted: true });
    } catch (err) {
      this.logger.error("Failed to delete workflow:", err);
      return res.error(err, 500);
    }
  }

  // ============================================================
  // EXECUTION
  // ============================================================

  /**
   * Execute workflow
   * POST /api/workflows/:workflowId/run
   */
  async execute(req, res) {
    try {
      const workflowId = Number(req.params.workflowId);
      const { input } = req.body || {};

      const run = await this.workflowService.executeWorkflow(
        workflowId,
        input || {}
      );

      await this.audit.automation("workflow.manual_run", {
        workflowId,
        runId: run.id
      }, req.auditContext?.userId || "system");

      return res.success({
        runId: run.id,
        status: run.status,
        totalDuration: run.totalDuration
      });
    } catch (err) {
      this.logger.error("Failed to execute workflow:", err);
      return res.error(err, 500);
    }
  }

  // ============================================================
  // DRY RUN & VALIDATION
  // ============================================================

  /**
   * Dry run workflow (preview without side effects)
   * POST /api/workflows/:workflowId/dry-run
   */
  async dryRun(req, res) {
    try {
      const workflowId = Number(req.params.workflowId);
      const { input } = req.body || {};

      const result = await this.workflowService.dryRunWorkflow(
        workflowId,
        input || {}
      );

      return res.success(result);
    } catch (err) {
      this.logger.error("Dry run failed:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Validate workflow definition
   * POST /api/workflows/validate
   */
  async validate(req, res) {
    try {
      const { definition } = req.body;

      if (!definition) {
        return res.fail("Definition is required", 400);
      }

      const validation = await this.workflowService.validateWorkflow(definition);

      if (!validation.valid) {
        return res.success({
          valid: false,
          errors: validation.errors
        });
      }

      return res.success({
        valid: true,
        message: "Workflow definition is valid"
      });
    } catch (err) {
      this.logger.error("Validation failed:", err);
      return res.error(err, 500);
    }
  }

  // ============================================================
  // EXECUTION HISTORY & METRICS
  // ============================================================

  /**
   * Get execution history
   * GET /api/workflows/:workflowId/history?limit=20&offset=0
   */
  async getHistory(req, res) {
    try {
      const workflowId = Number(req.params.workflowId);
      const { limit = 20, offset = 0 } = req.query;

      const history = await this.workflowService.getExecutionHistory(
        workflowId,
        Math.min(Number(limit) || 20, 100),
        Math.max(Number(offset) || 0, 0)
      );

      return res.success(history);
    } catch (err) {
      this.logger.error("Failed to get history:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Get execution details
   * GET /api/workflows/runs/:runId
   */
  async getExecutionDetails(req, res) {
    try {
      const runId = Number(req.params.runId);
      const details = await this.workflowService.getExecutionDetails(runId);

      if (!details) {
        return res.fail("Execution not found", 404);
      }

      return res.success(details);
    } catch (err) {
      this.logger.error("Failed to get execution details:", err);
      return res.error(err, 500);
    }
  }

  /**
   * Get workflow metrics
   * GET /api/workflows/:workflowId/metrics
   */
  async getMetrics(req, res) {
    try {
      const workflowId = Number(req.params.workflowId);
      const metrics = await this.workflowService.getMetrics(workflowId);
      return res.success(metrics);
    } catch (err) {
      this.logger.error("Failed to get metrics:", err);
      return res.error(err, 500);
    }
  }
}

module.exports = WorkflowController;