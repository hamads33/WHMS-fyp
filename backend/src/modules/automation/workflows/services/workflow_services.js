/**
 * Event Workflow Service - FIXED VERSION
 * ============================================================
 * Independent event-driven workflow management
 * Works with your AutomationWorkflow schema
 *
 * Handles:
 *  - Workflow CRUD operations
 *  - Event-based execution
 *  - Webhook management with signature verification
 *  - Trigger rules
 *  - Execution history & monitoring
 */

class EventWorkflowService {
  constructor(options = {}) {
    this.prisma = options.prisma;
    this.logger = options.logger || console;
    this.audit = options.audit;
    this.executor = options.executor;
    this.validator = options.validator;
    this.engine = options.engine;
    this.webhookSecret = options.webhookSecret || process.env.WEBHOOK_SECRET_KEY || 'default-secret';

    if (!this.prisma) {
      throw new Error("EventWorkflowService requires prisma");
    }
    if (!this.engine) {
      throw new Error("EventWorkflowService requires engine");
    }
  }

  /* =====================================================
     WORKFLOW CRUD
  ===================================================== */

  /**
   * List all event workflows
   */
  async listAll(filters = {}) {
    try {
      const where = { deletedAt: null };
      
      if (filters.enabled !== undefined) {
        where.enabled = filters.enabled;
      }
      
      if (filters.trigger) {
        where.trigger = filters.trigger;
      }
      
      if (filters.eventType) {
        where.eventType = filters.eventType;
      }
      
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { slug: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      return await this.prisma.automationWorkflow.findMany({
        where,
        include: {
          _count: {
            select: { 
              runs: true,
              webhooks: true,
              triggers: true,
              schedules: true,
              alerts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
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
      const id = parseInt(workflowId, 10);
      if (isNaN(id) || id <= 0) {
        throw new Error("Invalid workflow ID");
      }
      
      const workflow = await this.prisma.automationWorkflow.findUnique({
        where: { id },
        include: {
          runs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          webhooks: true,
          triggers: true,
          schedules: true,
          alerts: true,
          _count: {
            select: {
              runs: true,
              webhooks: true,
              triggers: true
            }
          }
        }
      });
      
      if (!workflow) {
        this.logger.debug(`Workflow not found: ${id}`);
        return null;
      }
      
      return workflow;
    } catch (error) {
      this.logger.error(`Error getting workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow by slug
   */
  async getBySlug(slug) {
    try {
      return await this.prisma.automationWorkflow.findUnique({
        where: { slug },
        include: {
          triggers: true,
          webhooks: true,
          schedules: true
        }
      });
    } catch (error) {
      this.logger.error(`Error getting workflow by slug ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Create workflow
   */
  async create(payload) {
    try {
      if (this.validator) {
        const validation = this.validator.validateWorkflow(payload.definition);
        if (!validation.valid) {
          throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
        }
      }

      const slug = this._generateSlug(payload.name);

      const validTriggers = ['manual', 'webhook', 'event', 'api'];
      const validTypes = ['sequential', 'parallel', 'conditional'];
      
      if (payload.trigger && !validTriggers.includes(payload.trigger)) {
        throw new Error(`Invalid trigger: ${payload.trigger}`);
      }
      
      if (payload.type && !validTypes.includes(payload.type)) {
        throw new Error(`Invalid type: ${payload.type}`);
      }

      const workflow = await this.prisma.automationWorkflow.create({
        data: {
          name: payload.name,
          slug,
          description: payload.description || '',
          definition: payload.definition,
          enabled: payload.enabled ?? true,
          trigger: payload.trigger || 'manual',
          type: payload.type || 'sequential',
          eventType: payload.eventType || null,
          eventFilter: payload.eventFilter || null,
          version: 1
        },
        include: {
          _count: {
            select: { runs: true }
          }
        }
      });

      if (this.audit) {
        try {
          await this.audit.system("workflow.created", {
            entity: "AutomationWorkflow",
            entityId: workflow.id,
            data: {
              name: workflow.name,
              trigger: workflow.trigger,
              slug: workflow.slug
            }
          });
        } catch (auditErr) {
          this.logger.warn("Audit logging failed:", auditErr);
        }
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
      if (payload.definition && this.validator) {
        const validation = this.validator.validateWorkflow(payload.definition);
        if (!validation.valid) {
          throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
        }
      }

      const updates = {};
      if (payload.name !== undefined) updates.name = payload.name;
      if (payload.description !== undefined) updates.description = payload.description;
      if (payload.definition !== undefined) {
        updates.definition = payload.definition;
        updates.version = { increment: 1 };
      }
      if (payload.enabled !== undefined) updates.enabled = payload.enabled;
      if (payload.trigger !== undefined) updates.trigger = payload.trigger;
      if (payload.type !== undefined) updates.type = payload.type;
      if (payload.eventType !== undefined) updates.eventType = payload.eventType;
      if (payload.eventFilter !== undefined) updates.eventFilter = payload.eventFilter;

      const workflow = await this.prisma.automationWorkflow.update({
        where: { id: workflowId },
        data: updates,
        include: {
          _count: {
            select: { runs: true }
          }
        }
      });

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

      return workflow;
    } catch (error) {
      this.logger.error(`Error updating workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Delete workflow (soft delete)
   */
  async delete(workflowId) {
    try {
      await this.prisma.automationWorkflow.update({
        where: { id: workflowId },
        data: { deletedAt: new Date() }
      });

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

      return { success: true, deleted: true };
    } catch (error) {
      this.logger.error(`Error deleting workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Restore soft-deleted workflow
   */
  async restore(workflowId) {
    try {
      return await this.prisma.automationWorkflow.update({
        where: { id: workflowId },
        data: { deletedAt: null }
      });
    } catch (error) {
      this.logger.error(`Error restoring workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /* =====================================================
     WORKFLOW EXECUTION
  ===================================================== */

  /**
   * Execute workflow manually
   */
  async executeWorkflow(workflowId, definition = null, input = {}, options = {}) {
    try {
      const id = parseInt(workflowId, 10);
      if (isNaN(id) || id <= 0) {
        throw new Error("Invalid workflow ID");
      }
      
      let workflow = null;
      if (!definition) {
        workflow = await this.prisma.automationWorkflow.findUnique({
          where: { id }
        });
        
        if (!workflow) {
          throw new Error(`Workflow not found: ${id}`);
        }
        
        if (!workflow.enabled) {
          throw new Error("Workflow is disabled");
        }
        
        definition = workflow.definition;
      }
      
      const workflowInput = (typeof input === 'object' && input !== null) 
        ? input 
        : {};
      
      if (!definition || typeof definition !== 'object') {
        throw new Error("Workflow definition is invalid");
      }
      
      if (!Array.isArray(definition.tasks) || definition.tasks.length === 0) {
        throw new Error("Workflow definition must contain at least one task");
      }
      
      const run = await this.prisma.workflowRun.create({
        data: {
          workflowId: id,
          status: 'running',
          input: workflowInput,
          triggeredBy: options.triggeredBy || 'manual',
          triggerId: options.triggeredByEventId || options.webhookId || null,
          startedAt: new Date()
        }
      });
      
      // Execute in background with proper error handling
      this._executeInBackground(id, definition, workflowInput, run.id, options);
      
      this.logger.info(`Workflow ${id} execution started (run: ${run.id})`);
      
      return {
        runId: run.id,
        status: 'started',
        dryRun: options.dryRun === true
      };
    } catch (error) {
      this.logger.error(`Error executing workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Execute workflow in background (PRIVATE)
   */
  _executeInBackground(workflowId, definition, input, runId, options) {
    setImmediate(async () => {
      try {
        const result = await this.engine.execute(workflowId, definition, input, options);
        await this._updateRunWithResult(runId, result);
      } catch (error) {
        this.logger.error(`Background execution failed for run ${runId}:`, error);
        await this._markRunFailed(runId, error);
      }
    });
  }

  /**
   * Execute workflow from webhook trigger
   */
  async executeFromWebhook(webhookId, payload = {}) {
    let webhook = null;
    
    try {
      if (!webhookId || typeof webhookId !== 'string') {
        throw new Error("Invalid webhook ID");
      }
      
      webhook = await this.prisma.incomingWebhook.findUnique({
        where: { id: webhookId },
        include: { workflow: true }
      });
      
      if (!webhook) {
        throw new Error(`Webhook not found: ${webhookId}`);
      }
      
      if (!webhook.enabled) {
        throw new Error("Webhook is disabled");
      }
      
      if (!webhook.workflow) {
        throw new Error("Workflow not found for webhook");
      }
      
      if (!webhook.workflow.enabled) {
        throw new Error("Workflow is disabled");
      }
      
      const webhookPayload = typeof payload === 'object' && payload !== null ? payload : {};
      
      const run = await this.prisma.workflowRun.create({
        data: {
          workflowId: webhook.workflowId,
          status: 'running',
          triggeredBy: 'webhook',
          triggerId: webhookId,
          input: webhookPayload,
          startedAt: new Date()
        }
      });
      
      await this.prisma.incomingWebhook.update({
        where: { id: webhookId },
        data: {
          totalReceived: { increment: 1 },
          lastReceivedAt: new Date(),
          failureCount: 0
        }
      });
      
      this._executeInBackground(
        webhook.workflow.id,
        webhook.workflow.definition,
        webhookPayload,
        run.id,
        { triggeredBy: 'webhook', webhookId }
      );
      
      this.logger.info(`Webhook ${webhookId} received and workflow ${webhook.workflowId} queued`);
      
      return {
        runId: run.id,
        webhookId,
        status: 'processing'
      };
    } catch (error) {
      this.logger.error(`Error processing webhook ${webhookId}:`, error);
      
      if (webhook) {
        try {
          await this.prisma.incomingWebhook.update({
            where: { id: webhookId },
            data: {
              failureCount: { increment: 1 },
              lastError: error.message
            }
          });
        } catch (updateError) {
          this.logger.warn(`Failed to update webhook error stats:`, updateError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Receive webhook (PUBLIC - wrapper for executeFromWebhook)
   */
  async receiveWebhook(webhookId, payload = {}) {
    return this.executeFromWebhook(webhookId, payload);
  }

  /**
   * Execute workflow from event
   */
  async executeFromEvent(eventType, eventData = {}) {
    try {
      const rules = await this.prisma.workflowTriggerRule.findMany({
        where: {
          eventType,
          enabled: true
        },
        include: { workflow: true }
      });

      const results = [];

      for (const rule of rules) {
        try {
          const workflow = rule.workflow;

          if (!workflow.enabled) {
            continue;
          }

          if (rule.conditions) {
            const conditionsMet = this._checkConditions(eventData, rule.conditions);
            if (!conditionsMet) {
              continue;
            }
          }

          const input = rule.passEventAsInput 
            ? (rule.inputMapping ? this._mapInput(eventData, rule.inputMapping) : eventData)
            : {};

          const result = await this.engine.execute(
            workflow.id,
            workflow.definition,
            input,
            { continueOnError: true }
          );

          const run = await this.prisma.workflowRun.create({
            data: {
              workflowId: workflow.id,
              status: result.status || 'success',
              triggeredBy: 'event',
              triggerId: eventType,
              input,
              output: result.output,
              errorMessage: result.error,
              errorStack: null,
              totalDuration: result.duration,
              successCount: result.context?.successCount || 0,
              failureCount: result.context?.failureCount || 0,
              taskCount: workflow.definition.tasks?.length || 0,
              skippedCount: 0,
              startedAt: new Date(),
              finishedAt: new Date()
            }
          });

          results.push(run);
        } catch (err) {
          this.logger.error(`Error executing workflow for event ${eventType}:`, err);
          results.push({ error: err.message, workflowId: rule.workflowId });
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Error processing event ${eventType}:`, error);
      throw error;
    }
  }

  /* =====================================================
     WEBHOOK MANAGEMENT
  ===================================================== */

  /**
   * Create webhook for workflow
   */
  async createWebhook(workflowId, payload) {
    try {
      const workflow = await this.prisma.automationWorkflow.findUnique({
        where: { id: workflowId }
      });

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      const webhook = await this.prisma.incomingWebhook.create({
        data: {
          workflowId,
          url: payload.url || this._generateWebhookUrl(workflowId),
          secret: payload.secret || this._generateSecret(),
          enabled: payload.enabled ?? true,
          events: payload.events || ['*'],
          retryPolicy: payload.retryPolicy || { enabled: true, times: 3, delay: 5000 }
        }
      });

      return webhook;
    } catch (error) {
      this.logger.error(`Error creating webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * List webhooks for workflow
   */
  async listWebhooks(workflowId) {
    try {
      return await this.prisma.incomingWebhook.findMany({
        where: { workflowId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      this.logger.error(`Error listing webhooks for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId, payload) {
    try {
      return await this.prisma.incomingWebhook.update({
        where: { id: webhookId },
        data: {
          enabled: payload.enabled,
          events: payload.events,
          retryPolicy: payload.retryPolicy
        }
      });
    } catch (error) {
      this.logger.error(`Error updating webhook ${webhookId}:`, error);
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    try {
      await this.prisma.incomingWebhook.delete({
        where: { id: webhookId }
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting webhook ${webhookId}:`, error);
      throw error;
    }
  }

  /* =====================================================
     TRIGGER RULES
  ===================================================== */

  /**
   * Create trigger rule
   */
  async createTriggerRule(workflowId, payload) {
    try {
      const workflow = await this.prisma.automationWorkflow.findUnique({
        where: { id: workflowId }
      });
      
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }
      
      if (!payload.eventType || typeof payload.eventType !== 'string' || payload.eventType.trim().length === 0) {
        throw new Error("Event type is required and must be non-empty string");
      }
      
      const eventType = payload.eventType.trim();
      
      const existing = await this.prisma.workflowTriggerRule.findUnique({
        where: {
          workflowId_eventType: {
            workflowId,
            eventType
          }
        }
      });
      
      if (existing) {
        throw new Error(`Trigger rule already exists for event type: ${eventType}`);
      }
      
      const rule = await this.prisma.workflowTriggerRule.create({
        data: {
          workflowId,
          eventType,
          conditions: payload.conditions || null,
          passEventAsInput: payload.passEventAsInput ?? true,
          inputMapping: payload.inputMapping || null,
          enabled: payload.enabled ?? true
        }
      });
      
      this.logger.info(`Created trigger rule for workflow ${workflowId}: ${eventType}`);
      
      return rule;
    } catch (error) {
      this.logger.error(`Error creating trigger rule:`, error);
      throw error;
    }
  }

  /**
   * List trigger rules for workflow
   */
  async listTriggerRules(workflowId) {
    try {
      return await this.prisma.workflowTriggerRule.findMany({
        where: { workflowId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      this.logger.error(`Error listing trigger rules for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Update trigger rule
   */
  async updateTriggerRule(ruleId, payload) {
    try {
      return await this.prisma.workflowTriggerRule.update({
        where: { id: ruleId },
        data: {
          conditions: payload.conditions,
          passEventAsInput: payload.passEventAsInput,
          inputMapping: payload.inputMapping,
          enabled: payload.enabled
        }
      });
    } catch (error) {
      this.logger.error(`Error updating trigger rule ${ruleId}:`, error);
      throw error;
    }
  }

  /**
   * Delete trigger rule
   */
  async deleteTriggerRule(ruleId) {
    try {
      await this.prisma.workflowTriggerRule.delete({
        where: { id: ruleId }
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting trigger rule ${ruleId}:`, error);
      throw error;
    }
  }

  /* =====================================================
     EXECUTION HISTORY & METRICS
  ===================================================== */

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(workflowId, limit = 50, offset = 0) {
    try {
      const runs = await this.prisma.workflowRun.findMany({
        where: { workflowId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          taskRuns: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      const total = await this.prisma.workflowRun.count({
        where: { workflowId }
      });

      return {
        runs,
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error(`Error getting workflow history ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get execution details (FIXED - now implemented)
   */
  async getExecutionDetails(runId) {
    try {
      const id = parseInt(runId, 10);
      if (isNaN(id) || id <= 0) {
        throw new Error("Invalid run ID");
      }

      return await this.prisma.workflowRun.findUnique({
        where: { id },
        include: {
          workflow: true,
          taskRuns: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
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
      const runs = await this.prisma.workflowRun.findMany({
        where: { workflowId }
      });

      if (runs.length === 0) {
        return {
          totalRuns: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0,
          avgDuration: 0,
          status: 'no_data'
        };
      }

      const successful = runs.filter(r => r.status === 'success');
      const failed = runs.filter(r => r.status === 'failed');
      const totalDuration = runs.reduce((sum, r) => sum + (r.totalDuration || 0), 0);

      return {
        totalRuns: runs.length,
        successCount: successful.length,
        failureCount: failed.length,
        successRate: (successful.length / runs.length * 100).toFixed(2),
        avgDuration: Math.round(totalDuration / runs.length),
        minDuration: Math.min(...runs.map(r => r.totalDuration || 0)),
        maxDuration: Math.max(...runs.map(r => r.totalDuration || 0)),
        lastRun: runs[0]?.createdAt,
        status: successful.length > failed.length ? 'healthy' : 'degraded'
      };
    } catch (error) {
      this.logger.error(`Error getting metrics for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /* =====================================================
     UTILITIES
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
   * Generate URL slug from name
   */
  _generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }

  /**
   * Generate full webhook URL
   */
  _generateWebhookUrl(workflowId) {
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000/api/automation';
    const token = Math.random().toString(36).substr(2, 9);
    return `${baseUrl}/webhooks/${workflowId}/${token}`;
  }

  /**
   * Generate random secret
   */
  _generateSecret() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Check conditions against data
   */
  _checkConditions(data, conditions) {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    for (const [field, expectedValue] of Object.entries(conditions)) {
      const actualValue = this._getNestedValue(data, field);
      if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Map input based on mapping rules
   */
  _mapInput(eventData, mapping) {
    const result = {};
    for (const [key, path] of Object.entries(mapping)) {
      result[key] = this._getNestedValue(eventData, path);
    }
    return result;
  }

  /**
   * Get nested value from object safely
   */
  _getNestedValue(obj, path) {
    if (!path || typeof path !== 'string') return undefined;
    
    try {
      return path.split('.').reduce((current, prop) => {
        if (current === null || current === undefined) return undefined;
        return current[prop];
      }, obj);
    } catch (error) {
      this.logger.warn(`Error getting nested value for path ${path}:`, error);
      return undefined;
    }
  }

  /**
   * Update run with result
   */
  async _updateRunWithResult(runId, result) {
    try {
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: result.status || 'success',
          output: result.output || null,
          finishedAt: new Date(),
          totalDuration: result.duration || 0,
          errorMessage: result.error || null
        }
      });
    } catch (error) {
      this.logger.error(`Failed to update run ${runId}:`, error);
    }
  }

  /**
   * Mark run as failed
   */
  async _markRunFailed(runId, error) {
    try {
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          errorMessage: error.message || 'Unknown error',
          errorStack: error.stack || null,
          finishedAt: new Date()
        }
      });
    } catch (updateError) {
      this.logger.error(`Failed to mark run ${runId} as failed:`, updateError);
    }
  }
}

module.exports = EventWorkflowService;