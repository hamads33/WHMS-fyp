/**
 * Automation Module Bootstrap
 * ------------------------------------------------------------------
 * API-first automation & workflow engine.
 * Integrates profiles, tasks, runs, and workflows into unified system.
 */

const express = require("express");
const automationLogger = require("./lib/logger");

// ============================================================
// STORES
// ============================================================
const ProfileStore = require("./store/profileStore");
const TaskStore = require("./store/taskStore");
const ExecutionLogStore = require("./store/executionLogStore");
const WorkflowStore = require("./store/workflow_store");

// ============================================================
// SERVICES
// ============================================================
const AuditService = require("./services/audit.service");
const ExecutorService = require("./services/executor.service");
const SchedulerService = require("./services/scheduler.redis.service");
const WorkflowService = require("./workflows/services/workflow_services");

// ============================================================
// WORKFLOW ENGINE
// ============================================================
const VariableResolver = require("./workflows/engine/variable_resolver");
const WorkflowEngine = require("./workflows/engine/workflow_engine");

// ============================================================
// CONTROLLERS
// ============================================================
const ProfileController = require("./controllers/profile.controller");
const TaskController = require("./controllers/task.controller");
const RunController = require("./controllers/run.controller");
const AuditController = require("./controllers/audit.controller");
const WorkflowController = require("./workflows/controllers/workflow_controller");

// ============================================================
// MIDDLEWARE
// ============================================================
const responseFormatter = require("./middleware/responseFormatter");
const validate = require("./middleware/validate");
const auditContext = require("./middleware/auditContext");
const automationErrorHandler = require("./middleware/errorHandler");
const createWorkflowErrorHandler = require("./middleware/workflow_error_handler");

// ============================================================
// GUARDS
// ============================================================
const createGuards = require("./lib/workflow_guards");

// ============================================================
// VALIDATORS
// ============================================================
const WorkflowValidator = require("./validators/workflow_validators");

const profileSchema = require("./validators/profile.validator");
const taskSchema = require("./validators/task.validator");

const {
  idParamSchema,
  profileIdParamSchema,
  taskIdParamSchema,
} = require("./validators/params.validator");

// ============================================================
// MODULE INIT
// ============================================================
module.exports = async function initAutomationModule({
  app,
  prismaClient,
  logger = automationLogger,
}) {
  logger.info("⚙️ Initializing Automation Module...");

  // ============================================================
  // STORES
  // ============================================================
  const profileStore = new ProfileStore({ prisma: prismaClient });
  const taskStore = new TaskStore({ prisma: prismaClient });
  const executionLogStore = new ExecutionLogStore({ prisma: prismaClient });
  const workflowStore = new WorkflowStore({ prisma: prismaClient, logger });

  // ============================================================
  // SERVICES
  // ============================================================
  const audit = new AuditService({ prisma: prismaClient, logger });

  const executor = new ExecutorService({
    logger,
    prisma: prismaClient,
    audit,
    app,
  });

  const scheduler = new SchedulerService({
    executor,
    profileStore,
    taskStore,
    executionLogStore,
    audit,
    logger,
  });

  await scheduler.loadAndScheduleAll();

  // ============================================================
  // WORKFLOW ENGINE
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
  // CONTROLLERS
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

  const workflowCtrl = new WorkflowController({
    workflowService,
    logger,
    audit,
  });

  // ============================================================
  // ROUTER
  // ============================================================
  const router = express.Router();
  const guards = createGuards(prismaClient);
  const workflowErrorHandler = createWorkflowErrorHandler(logger);

  router.use(responseFormatter);
  router.use(auditContext());

  // ============================================================
  // PROFILES
  // ============================================================
  router.get("/profiles", profileCtrl.list.bind(profileCtrl));

  router.post("/profiles", validate(profileSchema), profileCtrl.create.bind(profileCtrl));

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

  router.post(
    "/tasks/:taskId/run",
    validate(taskIdParamSchema, "params"),
    taskCtrl.runNow.bind(taskCtrl)
  );

  // ============================================================
  // WORKFLOWS - CRUD
  // ============================================================
  router.get(
    "/workflows",
    workflowCtrl.list.bind(workflowCtrl)
  );

  router.post(
    "/workflows",
    validate(WorkflowValidator.workflowCreateSchema),
    workflowCtrl.create.bind(workflowCtrl)
  );

  router.get(
    "/workflows/:workflowId",
    guards.verifyWorkflowExists,
    workflowCtrl.get.bind(workflowCtrl)
  );

  router.put(
    "/workflows/:workflowId",
    guards.verifyWorkflowExists,
    guards.checkCanModifyWorkflow,
    validate(WorkflowValidator.workflowUpdateSchema),
    workflowCtrl.update.bind(workflowCtrl)
  );

  router.delete(
    "/workflows/:workflowId",
    guards.verifyWorkflowExists,
    workflowCtrl.delete.bind(workflowCtrl)
  );

  // ============================================================
  // WORKFLOWS - EXECUTION
  // ============================================================
  router.post(
    "/workflows/:workflowId/run",
    guards.verifyWorkflowExists,
    guards.checkWorkflowEnabled,
    guards.checkNoExecutionInProgress,
    guards.rateLimitDatabase(10),
    validate(WorkflowValidator.workflowExecutionInputSchema),
    workflowCtrl.execute.bind(workflowCtrl)
  );

  router.post(
    "/workflows/:workflowId/dry-run",
    guards.verifyWorkflowExists,
    validate(WorkflowValidator.dryRunSchema),
    workflowCtrl.dryRun.bind(workflowCtrl)
  );

  router.post(
    "/workflows/validate",
    validate(WorkflowValidator.workflowValidateSchema),
    workflowCtrl.validate.bind(workflowCtrl)
  );

  // ============================================================
  // WORKFLOWS - HISTORY & METRICS
  // ============================================================
  router.get(
    "/workflows/:workflowId/history",
    guards.verifyWorkflowExists,
    workflowCtrl.getHistory.bind(workflowCtrl)
  );

  router.get(
    "/workflows/runs/:runId",
    workflowCtrl.getExecutionDetails.bind(workflowCtrl)
  );

  router.get(
    "/workflows/:workflowId/metrics",
    guards.verifyWorkflowExists,
    workflowCtrl.getMetrics.bind(workflowCtrl)
  );

  // ============================================================
  // ERROR HANDLERS
  // ============================================================
  // Workflow error handler (must be before general error handler)
  router.use("/workflows", workflowErrorHandler);
  // General automation error handler (catches remaining errors)
  router.use(automationErrorHandler(logger));

  // ============================================================
  // MOUNT
  // ============================================================
  app.use("/api/automation", router);

  logger.info("🔥 Automation Module Ready");
  logger.info("📊 Core automation system initialized");
  logger.info("🚀 Enterprise workflow system ready");

  // ============================================================
  // RETURN PUBLIC API
  // ============================================================
  return {
    // Existing API
    scheduler,
    // Workflow system API
    workflowService,
    workflowEngine,
    workflowValidator,
    variableResolver,
    workflowStore,
    // Support services
    audit,
    executor,
  };
};