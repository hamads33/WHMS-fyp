/**
 * Event Workflow Controller - FIXED VERSION
 * ------------------------------------------------------------------
 * REST API endpoints for independent event-driven workflows
 *
 * Routes:
 *  GET    /api/workflows              List workflows
 *  POST   /api/workflows              Create workflow
 *  GET    /api/workflows/:id          Get workflow
 *  PUT    /api/workflows/:id          Update workflow
 *  DELETE /api/workflows/:id          Delete workflow
 *  POST   /api/workflows/:id/run      Execute workflow
 *  GET    /api/workflows/:id/history  Execution history
 *  GET    /api/workflows/:id/metrics  Performance metrics
 *
 * Webhook Routes:
 *  POST   /api/workflows/:id/webhooks           Create webhook
 *  GET    /api/workflows/:id/webhooks           List webhooks
 *  DELETE /api/webhooks/:webhookId              Delete webhook
 *  POST   /api/webhooks/:webhookId              Receive webhook (public)
 *
 * Trigger Routes:
 *  POST   /api/workflows/:id/triggers           Create trigger rule
 *  GET    /api/workflows/:id/triggers           List trigger rules
 *  DELETE /api/triggers/:ruleId                 Delete trigger rule
 *
 * Event Routes:
 *  POST   /api/events/:eventType               Fire event
 */

class EventWorkflowController {
  constructor({ workflowService, prisma, logger, audit }) {
    this.workflowService = workflowService;
    this.prisma = prisma;
    this.logger = logger || console;
    this.audit = audit;

    if (!this.prisma) {
      throw new Error("EventWorkflowController requires prisma");
    }
    if (!this.workflowService) {
      throw new Error("EventWorkflowController requires workflowService");
    }
  }

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  /**
   * List all event workflows
   * GET /api/workflows
   */
  async list(req, res) {
    try {
      const filters = {
        enabled: req.query.enabled === 'true' ? true : req.query.enabled === 'false' ? false : undefined,
        trigger: req.query.trigger,
        eventType: req.query.eventType,
        search: req.query.search
      };

      const workflows = await this.workflowService.listAll(filters);

      return res.json({ success: true, data: workflows });
    } catch (err) {
      this.logger.error("Failed to list workflows:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to list workflows",
        message: err.message
      });
    }
  }

  /**
   * Create event workflow (INDEPENDENT)
   * POST /api/workflows
   */
  async create(req, res) {
    try {
      const { name, description, definition, trigger, type, eventType, eventFilter } = req.body;

      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Workflow name is required and must be a non-empty string"
        });
      }

      if (!definition || typeof definition !== 'object') {
        return res.status(400).json({
          success: false,
          error: "Workflow definition is required and must be an object"
        });
      }

      if (!definition.tasks || !Array.isArray(definition.tasks)) {
        return res.status(400).json({
          success: false,
          error: "Workflow definition must contain a tasks array"
        });
      }

      // Validate trigger type
      const validTriggers = ['manual', 'webhook', 'event', 'api'];
      if (trigger && !validTriggers.includes(trigger)) {
        return res.status(400).json({
          success: false,
          error: `Trigger must be one of: ${validTriggers.join(', ')}`
        });
      }

      // Validate type
      const validTypes = ['sequential', 'parallel', 'conditional'];
      if (type && !validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Type must be one of: ${validTypes.join(', ')}`
        });
      }

      const workflow = await this.workflowService.create({
        name: name.trim(),
        description: description || '',
        definition,
        trigger: trigger || 'manual',
        type: type || 'sequential',
        eventType: eventType || null,
        eventFilter: eventFilter || null
      });

      // Audit log
      if (this.audit) {
        try {
          await this.audit.system("workflow.created", {
            entity: "AutomationWorkflow",
            entityId: workflow.id,
            data: { id: workflow.id, name: workflow.name, trigger: workflow.trigger }
          });
        } catch (auditErr) {
          this.logger.warn("Audit logging failed:", auditErr);
        }
      }

      return res.status(201).json({ success: true, data: workflow });
    } catch (err) {
      this.logger.error("Failed to create workflow:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to create workflow",
        message: err.message
      });
    }
  }

  /**
   * Get single event workflow
   * GET /api/workflows/:workflowId
   */
  async get(req, res) {
    try {
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      const workflow = await this.workflowService.getById(workflowId);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: "Workflow not found"
        });
      }

      return res.json({ success: true, data: workflow });
    } catch (err) {
      this.logger.error("Failed to get workflow:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to get workflow",
        message: err.message
      });
    }
  }

  /**
   * Get workflow by slug
   * GET /api/workflows/by-slug/:slug
   */
  async getBySlug(req, res) {
    try {
      const slug = req.params.slug;

      const workflow = await this.workflowService.getBySlug(slug);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: "Workflow not found"
        });
      }

      return res.json({ success: true, data: workflow });
    } catch (err) {
      this.logger.error("Failed to get workflow by slug:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to get workflow",
        message: err.message
      });
    }
  }

  /**
   * Update event workflow
   * PUT /api/workflows/:workflowId
   */
  async update(req, res) {
    try {
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      const { name, description, definition, enabled, trigger, type, eventType, eventFilter } = req.body;

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (definition !== undefined) updates.definition = definition;
      if (enabled !== undefined) updates.enabled = enabled;
      if (trigger !== undefined) updates.trigger = trigger;
      if (type !== undefined) updates.type = type;
      if (eventType !== undefined) updates.eventType = eventType;
      if (eventFilter !== undefined) updates.eventFilter = eventFilter;

      const workflow = await this.workflowService.update(workflowId, updates);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: "Workflow not found"
        });
      }

      // Audit log
      if (this.audit) {
        try {
          await this.audit.system("workflow.updated", {
            entity: "AutomationWorkflow",
            entityId: workflowId,
            data: { changes: Object.keys(updates) }
          });
        } catch (auditErr) {
          this.logger.warn("Audit logging failed:", auditErr);
        }
      }

      return res.json({ success: true, data: workflow });
    } catch (err) {
      this.logger.error("Failed to update workflow:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to update workflow",
        message: err.message
      });
    }
  }

  /**
   * Delete event workflow (soft delete)
   * DELETE /api/workflows/:workflowId
   */
  async delete(req, res) {
    try {
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      await this.workflowService.delete(workflowId);

      // Audit log
      if (this.audit) {
        try {
          await this.audit.system("workflow.deleted", {
            entity: "AutomationWorkflow",
            entityId: workflowId
          });
        } catch (auditErr) {
          this.logger.warn("Audit logging failed:", auditErr);
        }
      }

      return res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      this.logger.error("Failed to delete workflow:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to delete workflow",
        message: err.message
      });
    }
  }

  /**
   * Restore soft-deleted workflow
   * POST /api/workflows/:workflowId/restore
   */
  async restore(req, res) {
    try {
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      const workflow = await this.workflowService.restore(workflowId);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: "Workflow not found"
        });
      }

      return res.json({ success: true, data: workflow });
    } catch (err) {
      this.logger.error("Failed to restore workflow:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to restore workflow",
        message: err.message
      });
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
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      const input = req.body.input || {};
      const dryRun = req.body.dryRun === true;

      const result = await this.workflowService.executeWorkflow(
        workflowId,
        null,
        input,
        { dryRun }
      );

      return res.json({
        success: true,
        data: {
          runId: result.runId,
          status: result.status,
          dryRun: result.dryRun
        }
      });
    } catch (err) {
      this.logger.error("Failed to execute workflow:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to execute workflow",
        message: err.message
      });
    }
  }

  // ============================================================
  // WEBHOOKS
  // ============================================================

  /**
   * Create webhook for workflow
   * POST /api/workflows/:workflowId/webhooks
   */
  async createWebhook(req, res) {
    try {
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      if (!req.body.name) {
        return res.status(400).json({
          success: false,
          error: "Webhook name is required"
        });
      }

      const webhook = await this.workflowService.createWebhook(workflowId, {
        name: req.body.name,
        description: req.body.description
      });

      return res.status(201).json({ success: true, data: webhook });
    } catch (err) {
      this.logger.error("Failed to create webhook:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to create webhook",
        message: err.message
      });
    }
  }

  /**
   * List webhooks for workflow
   * GET /api/workflows/:workflowId/webhooks
   */
  async listWebhooks(req, res) {
    try {
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      const webhooks = await this.workflowService.listWebhooks(workflowId);

      return res.json({ success: true, data: webhooks });
    } catch (err) {
      this.logger.error("Failed to list webhooks:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to list webhooks",
        message: err.message
      });
    }
  }

  /**
   * Receive webhook payload
   * POST /api/webhooks/:webhookId
   */
  async receiveWebhook(req, res) {
    try {
      const webhookId = req.params.webhookId;

      if (!webhookId) {
        return res.status(400).json({
          success: false,
          error: "Webhook ID is required"
        });
      }

      // FIXED: Call correct method
      const result = await this.workflowService.receiveWebhook(webhookId, req.body);

      return res.json({ success: true, data: result });
    } catch (err) {
      this.logger.error("Failed to receive webhook:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to receive webhook",
        message: err.message
      });
    }
  }

  /**
   * Delete webhook
   * DELETE /api/webhooks/:webhookId
   */
  async deleteWebhook(req, res) {
    try {
      const webhookId = req.params.webhookId;

      if (!webhookId) {
        return res.status(400).json({
          success: false,
          error: "Webhook ID is required"
        });
      }

      await this.workflowService.deleteWebhook(webhookId);

      return res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      this.logger.error("Failed to delete webhook:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to delete webhook",
        message: err.message
      });
    }
  }

  // ============================================================
  // TRIGGER RULES
  // ============================================================

  /**
   * Create trigger rule
   * POST /api/workflows/:workflowId/triggers
   */
  async createTriggerRule(req, res) {
    try {
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      if (!req.body.eventType) {
        return res.status(400).json({
          success: false,
          error: "Event type is required"
        });
      }

      const rule = await this.workflowService.createTriggerRule(workflowId, req.body);

      return res.status(201).json({ success: true, data: rule });
    } catch (err) {
      this.logger.error("Failed to create trigger rule:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to create trigger rule",
        message: err.message
      });
    }
  }

  /**
   * List trigger rules
   * GET /api/workflows/:workflowId/triggers
   */
  async listTriggerRules(req, res) {
    try {
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      const rules = await this.workflowService.listTriggerRules(workflowId);

      return res.json({ success: true, data: rules });
    } catch (err) {
      this.logger.error("Failed to list trigger rules:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to list trigger rules",
        message: err.message
      });
    }
  }

  /**
   * Delete trigger rule
   * DELETE /api/triggers/:ruleId
   */
  async deleteTriggerRule(req, res) {
    try {
      const ruleId = req.params.ruleId;

      if (!ruleId) {
        return res.status(400).json({
          success: false,
          error: "Rule ID is required"
        });
      }

      await this.workflowService.deleteTriggerRule(ruleId);

      return res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      this.logger.error("Failed to delete trigger rule:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to delete trigger rule",
        message: err.message
      });
    }
  }

  // ============================================================
  // EVENTS
  // ============================================================

  /**
   * Fire event to trigger workflows
   * POST /api/events/:eventType
   */
  async triggerFromEvent(req, res) {
    try {
      const eventType = req.params.eventType;

      if (!eventType) {
        return res.status(400).json({
          success: false,
          error: "Event type is required"
        });
      }

      // Record event
      const event = await this.prisma.workflowEvent.create({
        data: {
          type: eventType,
          source: 'api',
          data: req.body
        }
      });

      // Trigger workflows
      const results = await this.workflowService.executeFromEvent(eventType, req.body);

      return res.json({
        success: true,
        data: {
          eventType,
          eventId: event.id,
          triggered: results.length,
          results
        }
      });
    } catch (err) {
      this.logger.error("Failed to trigger from event:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to trigger from event",
        message: err.message
      });
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
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = Math.max(parseInt(req.query.offset) || 0, 0);

      const history = await this.workflowService.getExecutionHistory(workflowId, limit, offset);

      return res.json({ success: true, data: history });
    } catch (err) {
      this.logger.error("Failed to get history:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to get history",
        message: err.message
      });
    }
  }

  /**
   * Get execution details
   * GET /api/runs/:runId
   */
  async getExecutionDetails(req, res) {
    try {
      const runId = req.params.runId;

      if (!runId) {
        return res.status(400).json({
          success: false,
          error: "Invalid run ID"
        });
      }

      const details = await this.workflowService.getExecutionDetails(runId);

      if (!details) {
        return res.status(404).json({
          success: false,
          error: "Execution not found"
        });
      }

      return res.json({ success: true, data: details });
    } catch (err) {
      this.logger.error("Failed to get execution details:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to get execution details",
        message: err.message
      });
    }
  }

  /**
   * Get workflow metrics
   * GET /api/workflows/:workflowId/metrics
   */
  async getMetrics(req, res) {
    try {
      const workflowId = req.params.workflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          error: "Invalid workflow ID"
        });
      }

      const metrics = await this.workflowService.getMetrics(workflowId);

      return res.json({ success: true, data: metrics });
    } catch (err) {
      this.logger.error("Failed to get metrics:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to get metrics",
        message: err.message
      });
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
        return res.status(400).json({
          success: false,
          error: "Definition is required"
        });
      }

      const validation = await this.workflowService.validateWorkflow(definition);

      if (!validation.valid) {
        return res.json({
          success: true,
          data: {
            valid: false,
            errors: validation.errors
          }
        });
      }

      return res.json({
        success: true,
        data: {
          valid: true,
          message: "Workflow definition is valid"
        }
      });
    } catch (err) {
      this.logger.error("Validation failed:", err);
      return res.status(500).json({
        success: false,
        error: "Validation failed",
        message: err.message
      });
    }
  }
}

module.exports = EventWorkflowController;