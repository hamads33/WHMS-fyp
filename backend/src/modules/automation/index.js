// src/modules/automation/index.js

const express = require("express");

// Logger
const automationLogger = require("./lib/logger");

// Stores
const ProfileStore = require("./store/profileStore");
const TaskStore = require("./store/taskStore");
const ExecutionLogStore = require("./store/executionLogStore");

// Services
const AuditService = require("./services/audit.service");
const { BuiltInExecutor } = require("./services/executor.service");
const SchedulerService = require("./services/scheduler.service");

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
  const executor = new BuiltInExecutor({
    logger,
    prisma: prismaClient,
    audit,
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

  // Apply formatter
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
  // FIX ROUTE PARAM → profileId (NOT id)

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

  // Automation Error Handler
  router.use(automationErrorHandler(logger));

  // Mount router
  app.use("/api/automation", router);

  logger.info("🔥 Automation Module Ready");

  return { scheduler };
};
