/**
 * Automation Worker - ENHANCED WITH PROPER ERROR LOGGING
 * ------------------------------------------------------------------
 * Background worker responsible for executing automation jobs.
 *
 * Responsibilities:
 *  - Consume jobs from Redis queue
 *  - Execute tasks using ExecutorService
 *  - Update execution logs
 *  - Emit audit events
 *
 * Key Principle:
 *  - Worker runs independently of HTTP server
 *
 * Why this matters:
 *  - Prevents API blocking
 *  - Enables horizontal scaling
 *
 * FIXES:
 *  - Proper error message formatting for visibility
 *  - Error details logged with context
 *  - Stack traces always included
 */

const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const { createQueue } = require("../queue/jobQueue");
const ExecutorService = require("../services/executor.service");
const AuditService = require("../services/audit.service");

// identify worker node
const NODE_ID = process.env.WORKER_NODE_ID || "worker-default";

async function startWorker({
  app,
  prisma,
  logger,
  queueName = "automation",
  concurrency = 5
}) {
  // Use queue ONLY for enqueuing — NOT FOR WORKER CONNECTION.
  const { queue } = createQueue(queueName);

  // BullMQ v5 worker MUST use its own ioredis instance
  const workerRedis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null,   // REQUIRED in BullMQ v5
    enableReadyCheck: false       // REQUIRED in BullMQ v5
  });

  const audit = new AuditService({ prisma, logger });

  const executor = new ExecutorService({
    prisma,
    logger,
    audit,
    app, // plugin engine
  });

  const worker = new Worker(
    queueName,
    async (job) => {
      const { name, data } = job;
      logger.info(`Worker ${NODE_ID} processing: ${name}, jobId=${job.id}`);

      switch (name) {
        case "run-profile":
          return await handleRunProfile({ data, prisma, executor, audit, logger });

        case "run-task":
          return await handleRunSingleTask({ data, prisma, executor, audit, logger });

        default:
          logger.warn(`Unhandled job type: ${name}`);
      }
    },
    {
      connection: workerRedis,
      concurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.info(`Worker ${NODE_ID} completed job ${job.id} (${job.name})`);
  });

  worker.on("failed", (job, err) => {
    // ✅ FIXED: Proper error logging with full details
    logger.error(
      `Worker ${NODE_ID} failed job ${job.id} (${job.name}): ${err.message}`
    );
    logger.error(`  Error Code: ${err.code || 'N/A'}`);
    logger.error(`  Stack: ${err.stack}`);
    if (err.originalError) {
      logger.error(`  Original Error: ${err.originalError.message}`);
    }
  });

  worker.on("error", (err) => {
    // ✅ FIXED: Worker-level errors
    logger.error(`Worker ${NODE_ID} encountered an error: ${err.message}`);
    logger.error(`  Stack: ${err.stack}`);
  });

  return worker;
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleRunProfile({ data, prisma, executor, audit, logger }) {
  const { profileId, runId } = data;

  logger.info(`[runProfile] Starting profile execution: profileId=${profileId}, runId=${runId}`);

  await prisma.automationRun.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    const tasks = await prisma.automationTask.findMany({
      where: { profileId },
      orderBy: { order: "asc" },
    });

    logger.info(`[runProfile] Found ${tasks.length} tasks to execute`);

    for (const t of tasks) {
      logger.info(`[runProfile] Executing task: taskId=${t.id}, actionType=${t.actionType}`);

      const taskRun = await prisma.automationRun.create({
        data: {
          profileId,
          taskId: t.id,
          status: "pending",
        },
      });

      await prisma.automationRun.update({
        where: { id: taskRun.id },
        data: { status: "running", startedAt: new Date() },
      });

      try {
        const result = await executor.run({
          actionType: t.actionType,
          actionMeta: t.actionMeta || {},
        });

        logger.info(`[runProfile] Task ${t.id} completed successfully`);

        await prisma.automationRun.update({
          where: { id: taskRun.id },
          data: {
            status: "success",
            result,
            finishedAt: new Date(),
          },
        });

        await audit.automation(
          "task.complete",
          { profileId, taskId: t.id, nodeId: NODE_ID, result },
          "worker"
        );
      } catch (err) {
        // ✅ FIXED: Full error context
        logger.error(
          `[runProfile] Task ${t.id} failed: ${err.message}`
        );
        logger.error(
          `  Action Type: ${t.actionType}, Profile ID: ${profileId}`
        );
        logger.error(`  Error Code: ${err.code || 'N/A'}`);
        logger.error(`  Stack: ${err.stack}`);
        if (err.responseData) {
          logger.error(`  Response Data: ${JSON.stringify(err.responseData)}`);
        }
        if (err.status) {
          logger.error(`  HTTP Status: ${err.status}`);
        }

        await prisma.automationRun.update({
          where: { id: taskRun.id },
          data: {
            status: "failed",
            errorMessage: err.message,
            finishedAt: new Date(),
          },
        });

        await audit.automation(
          "task.failed",
          { 
            profileId, 
            taskId: t.id, 
            nodeId: NODE_ID, 
            error: err.message,
            errorCode: err.code,
            actionType: t.actionType,
          },
          "worker",
          "ERROR"
        );
      }
    }

    await prisma.automationRun.update({
      where: { id: runId },
      data: {
        status: "success",
        finishedAt: new Date(),
      },
    });

    logger.info(`[runProfile] Profile ${profileId} completed successfully`);

    await audit.automation(
      "profile.complete",
      { profileId, runId, nodeId: NODE_ID },
      "worker"
    );
  } catch (err) {
    // ✅ FIXED: Full error context for profile-level errors
    logger.error(
      `[runProfile] Profile ${profileId} failed: ${err.message}`
    );
    logger.error(`  Run ID: ${runId}`);
    logger.error(`  Error Code: ${err.code || 'N/A'}`);
    logger.error(`  Stack: ${err.stack}`);

    await prisma.automationRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        errorMessage: err.message,
        finishedAt: new Date(),
      },
    });

    await audit.automation(
      "profile.failed",
      { profileId, runId, nodeId: NODE_ID, error: err.message },
      "worker",
      "ERROR"
    );

    throw err;
  }
}

async function handleRunSingleTask({ data, prisma, executor, audit, logger }) {
  const { profileId, taskId, runId } = data;

  logger.info(`[runTask] Starting task execution: taskId=${taskId}, runId=${runId}`);

  await prisma.automationRun.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    // ✅ FIXED: Validate task exists
    const task = await prisma.automationTask.findUnique({ 
      where: { id: taskId } 
    });

    if (!task) {
      throw new Error(`Task not found: taskId=${taskId}`);
    }

    logger.info(`[runTask] Task found: actionType=${task.actionType}`);
    
    // ✅ FIXED: Log metadata details
    logger.info(
      `[runTask] Task metadata - actionType: ${task.actionType}, ` +
      `actionMeta keys: ${Object.keys(task.actionMeta || {}).join(', ')}`
    );

    if (!task.actionType) {
      throw new Error(`Task has no actionType: taskId=${taskId}`);
    }

    if (!task.actionMeta || typeof task.actionMeta !== 'object') {
      throw new Error(
        `Task actionMeta is invalid: taskId=${taskId}, ` +
        `received type=${typeof task.actionMeta}`
      );
    }

    logger.info(`[runTask] Executing action: ${task.actionType}`);

    const result = await executor.run({
      actionType: task.actionType,
      actionMeta: task.actionMeta || {},
    });

    logger.info(`[runTask] Task ${taskId} completed successfully`);

    await prisma.automationRun.update({
      where: { id: runId },
      data: {
        status: "success",
        result,
        finishedAt: new Date(),
      },
    });

    await audit.automation(
      "task.single.complete",
      { profileId, taskId, runId, nodeId: NODE_ID, result },
      "worker"
    );
  } catch (err) {
    // ✅ FIXED: Comprehensive error logging
    logger.error(
      `[runTask] Task ${taskId} failed: ${err.message}`
    );
    logger.error(`  Profile ID: ${profileId}`);
    logger.error(`  Run ID: ${runId}`);
    logger.error(`  Error Code: ${err.code || 'N/A'}`);
    logger.error(`  Stack: ${err.stack}`);
    
    // Log HTTP-specific error details if present
    if (err.status) {
      logger.error(`  HTTP Status: ${err.status}`);
    }
    if (err.responseData) {
      logger.error(`  Response Data: ${JSON.stringify(err.responseData)}`);
    }
    if (err.originalError) {
      logger.error(`  Original Error: ${err.originalError.message}`);
    }

    await prisma.automationRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        errorMessage: err.message,
        finishedAt: new Date(),
      },
    });

    await audit.automation(
      "task.single.failed",
      { 
        profileId, 
        taskId, 
        runId, 
        nodeId: NODE_ID, 
        error: err.message,
        errorCode: err.code,
      },
      "worker",
      "ERROR"
    );

    throw err;
  }
}

module.exports = startWorker;