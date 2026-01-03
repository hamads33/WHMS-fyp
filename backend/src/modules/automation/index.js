/**
 * Automation Module Bootstrap
 * ------------------------------------------------------------------
 * This file initializes the Automation module in an API-first manner.
 *
 * Responsibilities:
 *  - Wire together Stores, Services, Controllers (Dependency Injection)
 *  - Initialize scheduler and load persisted automation profiles
 *  - Register REST API routes under /api/automation
 *  - Initialize enterprise workflow system
 *
 * Architectural Notes:
 *  - Follows modular-monolith pattern (similar to WHMCS)
 *  - Controllers do NOT contain business logic
 *  - Scheduler is initialized once during system startup
 *  - Execution is asynchronous via Redis + BullMQ workers
 *  - Workflow system is enterprise-grade with full CRUD + execution
 *
 * Design Rationale:
 *  - Keeps automation isolated from core system modules
 *  - Allows future extraction into a microservice if needed
 *  - Strict API-first compliance (no UI assumptions)
 *  - Workflow system scales independently
 */

const express = require("express");

// Logger
const automationLogger = require("./lib/logger");

// ============================================================
// CORE STORES
// ============================================================
const ProfileStore = require("./store/profileStore");
const TaskStore = require("./store/taskStore");
const ExecutionLogStore = require("./store/executionLogStore");

// ============================================================
// WORKFLOW STORES
// ============================================================
const WorkflowStore = require("./store/workflow_store");

// ============================================================
// CORE SERVICES
// ============================================================
const AuditService = require("./services/audit.service");
const ExecutorService = require("./services/executor.service");
const SchedulerService = require("./services/scheduler.redis.service");

// ============================================================
// WORKFLOW SERVICES
// ============================================================
const WorkflowService = require("./workflows/services/workflow_services");

// ============================================================
// WORKFLOW ENGINE
// ============================================================
const WorkflowValidator = require("./workflows/engine/workflow_validator");
const VariableResolver = require("./workflows/engine/ variable_resolver");
const WorkflowEngine = require("./workflows/engine/workflow_engine");

// ============================================================
// CORE CONTROLLERS
// ============================================================
const ProfileController = require("./controllers/profile.controller");
const TaskController = require("./controllers/task.controller");
const RunController = require("./controllers/run.controller");
const AuditController = require("./controllers/audit.controller");

// ============================================================
// WORKFLOW CONTROLLERS
// ============================================================
const WorkflowController = require("./workflows/controllers/workflow_controller");

// ============================================================
// CORE MIDDLEWARES
// ============================================================
const responseFormatter = require("./middleware/responseFormatter");
const validate = require("./middleware/validate");
const auditContext = require("./middleware/auditContext");
const automationErrorHandler = require("./middleware/errorHandler");

// ============================================================
// WORKFLOW MIDDLEWARES
// ============================================================
const workflowErrorHandler = require("./middleware/workflow_error_handler");
const {
  createGuards,
  rateLimit,
} = require("./lib/workflow_guards");

// ============================================================
// WORKFLOW VALIDATORS
// ============================================================
const {
  workflowDefinitionSchema,
  workflowCreateSchema,
  workflowUpdateSchema,
  workflowExecutionInputSchema,
  dryRunSchema,
  workflowValidateSchema,
} = require("./validators/workflow_validators");

// ============================================================
// CORE VALIDATORS
// ============================================================
const profileSchema = require("./validators/profile.validator");
const taskSchema = require("./validators/task.validator");

const {
  idParamSchema,
  profileIdParamSchema,
  taskIdParamSchema,
} = require("./validators/params.validator");

module.exports = async function initAutomationModule({
  app,
  prismaClient,
  logger = automationLogger,
  config = {},
}) {
  logger.info("⚙️ Initializing Automation Module...");

  // ============================================================
  // CORE STORES INITIALIZATION
  // ============================================================
  const profileStore = new ProfileStore({ prisma: prismaClient });
  const taskStore = new TaskStore({ prisma: prismaClient });
  const executionLogStore = new ExecutionLogStore({ prisma: prismaClient });

  // ============================================================
  // WORKFLOW STORES INITIALIZATION
  // ============================================================
  const workflowStore = new WorkflowStore({ prisma: prismaClient, logger });

  // ============================================================
  // CORE SERVICES INITIALIZATION
  // ============================================================
  const audit = new AuditService({ prisma: prismaClient, logger });

  const executor = new ExecutorService({
    logger,
    prisma: prismaClient,
    audit,
    app, // required for plugin engine if used locally
  });

  const scheduler = new SchedulerService({
    executor,
    profileStore,
    taskStore,
    executionLogStore,
    audit,
    logger,
  });

  // Load and schedule all enabled profiles
  await scheduler.loadAndScheduleAll();

  // ============================================================
  // WORKFLOW ENGINE INITIALIZATION
  // ============================================================
  const workflowValidator = new WorkflowValidator();
  const variableResolver = new VariableResolver({
    logger,
    allowUndefined: false,
  });

  const workflowEngine = new WorkflowEngine({
    executor,
    logger,
    prisma: prismaClient,
    variableResolver,
    validator: workflowValidator,
  });

  // ============================================================
  // WORKFLOW SERVICE INITIALIZATION
  // ============================================================
  const workflowService = new WorkflowService({
    prisma: prismaClient,
    logger,
    audit,
    store: workflowStore,
    executor,
    validator: workflowValidator,
    engine: workflowEngine,
  });

  // ============================================================
  // CORE CONTROLLERS INITIALIZATION
  // ============================================================
  const profileCtrl = new ProfileController({
    profileStore,
    scheduler,
    logger,
    audit,
  });

  const taskCtrl = new TaskController({
    taskStore,
    profileStore,
    scheduler,
    executor,
    executionLogStore,
    audit,
    logger,
  });

  const runCtrl = new RunController({
    profileStore,
    executor,
    executionLogStore,
    audit,
    scheduler,
    logger,
  });

  const auditCtrl = new AuditController({ auditService: audit });

  // ============================================================
  // WORKFLOW CONTROLLERS INITIALIZATION
  // ============================================================
  const workflowCtrl = new WorkflowController({
    workflowService,
    logger,
    audit,
  });

  // ============================================================
  // WORKFLOW GUARDS INITIALIZATION
  // ============================================================
  const guards = createGuards(prismaClient);

  // ============================================================
  // ROUTER SETUP
  // ============================================================
  const router = express.Router();

  // Middleware: Format responses
  router.use(responseFormatter);

  // Middleware: Extract audit context (IP, user, user agent)
  router.use(auditContext());

  // ============================================================
  // PROFILES
  // ============================================================

  router.get("/profiles", profileCtrl.list.bind(profileCtrl));

  router.post(
    "/profiles",
    validate(profileSchema),
    profileCtrl.create.bind(profileCtrl)
  );

  router.get(
    "/profiles/:id",
    validate(idParamSchema, "params"),
    profileCtrl.get.bind(profileCtrl)
  );

  router.put(
    "/profiles/:id",
    validate(idParamSchema, "params"),
    validate(profileSchema),
    profileCtrl.update.bind(profileCtrl)
  );

  router.delete(
    "/profiles/:id",
    validate(idParamSchema, "params"),
    profileCtrl.delete.bind(profileCtrl)
  );

  router.post(
    "/profiles/:id/enable",
    validate(idParamSchema, "params"),
    profileCtrl.enable.bind(profileCtrl)
  );

  router.post(
    "/profiles/:id/disable",
    validate(idParamSchema, "params"),
    profileCtrl.disable.bind(profileCtrl)
  );

  // ============================================================
  // TASKS
  // ============================================================

  router.get(
    "/profiles/:profileId/tasks",
    validate(profileIdParamSchema, "params"),
    taskCtrl.listForProfile.bind(taskCtrl)
  );

  router.post(
    "/profiles/:profileId/tasks",
    validate(profileIdParamSchema, "params"),
    validate(taskSchema),
    taskCtrl.createForProfile.bind(taskCtrl)
  );

  router.get(
    "/tasks/:taskId",
    validate(taskIdParamSchema, "params"),
    taskCtrl.get.bind(taskCtrl)
  );

  router.put(
    "/tasks/:taskId",
    validate(taskIdParamSchema, "params"),
    validate(taskSchema),
    taskCtrl.update.bind(taskCtrl)
  );

  router.delete(
    "/tasks/:taskId",
    validate(taskIdParamSchema, "params"),
    taskCtrl.delete.bind(taskCtrl)
  );

  router.post(
    "/tasks/:taskId/run",
    validate(taskIdParamSchema, "params"),
    taskCtrl.runNow.bind(taskCtrl)
  );

  // ============================================================
  // RUN PROFILE NOW
  // ============================================================

  router.post(
    "/run/:profileId",
    validate(profileIdParamSchema, "params"),
    runCtrl.runNow.bind(runCtrl)
  );

  // ============================================================
  // ACTION REGISTRY (Built-in + Plugins later)
  // ============================================================
  router.get("/actions", (req, res) => {
    try {
      const ActionRegistry = require("./actions/registry");
      return res.success(ActionRegistry.list());
    } catch (err) {
      return res.error(err, 500);
    }
  });

  // ============================================================
  // AUDIT LOGS (READ-ONLY)
  // ============================================================

  // Disable cache for audit routes
  router.use("/audit", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  // GET /api/automation/audit/logs
  router.get(
    "/audit/logs",
    auditCtrl.getLogs.bind(auditCtrl)
  );

  // GET /api/automation/audit/profiles/:profileId/logs
  router.get(
    "/audit/profiles/:profileId/logs",
    validate(profileIdParamSchema, "params"),
    auditCtrl.getLogsForProfile.bind(auditCtrl)
  );

  // GET /api/automation/audit/logs/count
  router.get(
    "/audit/logs/count",
    auditCtrl.getTotalLogs.bind(auditCtrl)
  );

  // GET /api/automation/audit/profiles/:profileId/logs/count
  router.get(
    "/audit/profiles/:profileId/logs/count",
    validate(profileIdParamSchema, "params"),
    auditCtrl.getProfileLogCount.bind(auditCtrl)
  );

  // ============================================================
  // ENTERPRISE WORKFLOWS
  // ============================================================

  // Disable cache for workflow routes
  router.use("/workflows", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  // List workflows for profile
  router.get(
    "/profiles/:profileId/workflows",
    validate(profileIdParamSchema, "params"),
    workflowCtrl.listForProfile.bind(workflowCtrl)
  );

  // Create workflow for profile
  router.post(
    "/profiles/:profileId/workflows",
    validate(profileIdParamSchema, "params"),
    validate(workflowCreateSchema),
    guards.verifyProfileExists,
    workflowCtrl.create.bind(workflowCtrl)
  );

  // Get single workflow
  router.get(
    "/workflows/:workflowId",
    guards.verifyWorkflowOwnership,
    workflowCtrl.get.bind(workflowCtrl)
  );

  // Update workflow
  router.put(
    "/workflows/:workflowId",
    guards.verifyWorkflowOwnership,
    guards.checkCanModifyWorkflow,
    validate(workflowUpdateSchema),
    workflowCtrl.update.bind(workflowCtrl)
  );

  // Delete workflow
  router.delete(
    "/workflows/:workflowId",
    guards.verifyWorkflowOwnership,
    guards.checkCanModifyWorkflow,
    workflowCtrl.delete.bind(workflowCtrl)
  );

  // Execute workflow
  router.post(
    "/workflows/:workflowId/run",
    guards.verifyWorkflowOwnership,
    guards.checkWorkflowEnabled,
    guards.checkNoExecutionInProgress,
    rateLimit(10), // 10 executions per minute
    validate(workflowExecutionInputSchema),
    workflowCtrl.execute.bind(workflowCtrl)
  );

  // Dry run (preview execution without side effects)
  router.post(
    "/workflows/:workflowId/dry-run",
    guards.verifyWorkflowOwnership,
    guards.checkWorkflowEnabled,
    validate(dryRunSchema),
    workflowCtrl.dryRun.bind(workflowCtrl)
  );

  // Validate workflow definition
  router.post(
    "/workflows/validate",
    validate(workflowValidateSchema),
    workflowCtrl.validate.bind(workflowCtrl)
  );

  // Get execution history
  router.get(
    "/workflows/:workflowId/history",
    guards.verifyWorkflowOwnership,
    workflowCtrl.getHistory.bind(workflowCtrl)
  );

  // Get execution details
  router.get(
    "/workflows/runs/:runId",
    workflowCtrl.getExecutionDetails.bind(workflowCtrl)
  );

  // Get workflow metrics
  router.get(
    "/workflows/:workflowId/metrics",
    guards.verifyWorkflowOwnership,
    workflowCtrl.getMetrics.bind(workflowCtrl)
  );

  // ============================================================
  // TEST PLUGIN RUN (For development)
  // ============================================================
  router.post("/test-plugin-run", async (req, res) => {
    try {
      const { pluginId, actionName, meta } = req.body;

      if (!pluginId || !actionName) {
        return res.fail(
          "pluginId and actionName are required",
          400,
          "missing_params"
        );
      }

      const result = await executor.run({
        actionType: `plugin:${pluginId}:${actionName}`,
        actionMeta: meta || {},
      });

      return res.success({ ok: true, result });
    } catch (err) {
      logger.error("Test plugin run error:", err);
      return res.error(err, 500);
    }
  });

  // ============================================================
  // ERROR HANDLERS
  // ============================================================
  
  // Workflow-specific error handler (for workflow routes)
  router.use("/workflows", workflowErrorHandler(logger));
  
  // General automation error handler
  router.use(automationErrorHandler(logger));

  // ============================================================
  // MOUNT ROUTER
  // ============================================================
  app.use("/api/automation", router);

  logger.info("🔥 Automation Module Ready");
  logger.info("📊 Core automation system initialized");
  logger.info("🚀 Enterprise workflow system ready");

  return { 
    scheduler,
    workflowService,
    workflowEngine,
  };
};