
/**
 * Automation Module Bootstrap
 * ------------------------------------------------------------------
 * This file initializes the Automation module in an API-first manner.
 *
 * Responsibilities:
 *  - Wire together Stores, Services, Controllers (Dependency Injection)
 *  - Initialize scheduler and load persisted automation profiles
 *  - Register REST API routes under /api/automation
 *
 * Architectural Notes:
 *  - Follows modular-monolith pattern (similar to WHMCS)
 *  - Controllers do NOT contain business logic
 *  - Scheduler is initialized once during system startup
 *  - Execution is asynchronous via Redis + BullMQ workers
 *
 * Design Rationale:
 *  - Keeps automation isolated from core system modules
 *  - Allows future extraction into a microservice if needed
 *  - Strict API-first compliance (no UI assumptions)
 */

const express = require("express");

// Logger
const automationLogger = require("./lib/logger");

// Stores
const ProfileStore = require("./store/profileStore");
const TaskStore = require("./store/taskStore");
const ExecutionLogStore = require("./store/executionLogStore");

// Services
const AuditService = require("./services/audit.service");
const ExecutorService = require("./services/executor.service");
const SchedulerService = require("./services/scheduler.redis.service");

// Controllers
const ProfileController = require("./controllers/profile.controller");
const TaskController = require("./controllers/task.controller");
const RunController = require("./controllers/run.controller");

// Middlewares
const responseFormatter = require("./middleware/responseFormatter");
const validate = require("./middleware/validate");
const automationErrorHandler = require("./middleware/errorHandler");

// Validators
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

  // Stores
  const profileStore = new ProfileStore({ prisma: prismaClient });
  const taskStore = new TaskStore({ prisma: prismaClient });
  const executionLogStore = new ExecutionLogStore({ prisma: prismaClient });

  // Services
  const audit = new AuditService({ prisma: prismaClient, logger });

  // Use ExecutorService directly (workers will also instantiate)
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

  await scheduler.loadAndScheduleAll();

  // Controllers
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
  });

  // Router
  const router = express.Router();

  // JSON formatter
  router.use(responseFormatter);

  // ----------------------------------------------------
  // PROFILES
  // ----------------------------------------------------

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

  // ----------------------------------------------------
  // TASKS
  // ----------------------------------------------------

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

  // ----------------------------------------------------
  // RUN PROFILE NOW
  // ----------------------------------------------------

  router.post(
    "/run/:profileId",
    validate(profileIdParamSchema, "params"),
    runCtrl.runNow.bind(runCtrl)
  );

  // ----------------------------------------------------
  // BUILT-IN ACTIONS
  // ----------------------------------------------------

  router.get("/actions", (req, res) => {
    const builtInActions = require("./services/builtInActions.service");
    return res.success(builtInActions.listActions());
  });

  // ----------------------------------------------------
  // TEST PLUGIN RUN
  // ----------------------------------------------------
  router.post("/test-plugin-run", async (req, res) => {
    try {
      const { pluginId, actionName, meta } = req.body;

      if (!pluginId || !actionName) {
        return res.status(400).json({
          error: "pluginId and actionName are required",
        });
      }

      const result = await executor.run({
        actionType: `plugin:${pluginId}:${actionName}`,
        actionMeta: meta || {},
      });

      return res.json({ ok: true, result });
    } catch (err) {
      logger.error("Test plugin run error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Automation Error Handler
  router.use(automationErrorHandler(logger));

  // Mount router
  app.use("/api/automation", router);

  logger.info("🔥 Automation Module Ready");

  return { scheduler };
};
