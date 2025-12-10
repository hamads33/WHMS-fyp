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
  // Use queue ONLY for enqueuing – NOT FOR WORKER CONNECTION.
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
    logger.error(`Worker ${NODE_ID} failed job ${job.id} (${job.name}):`, err);
  });

  return worker;
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleRunProfile({ data, prisma, executor, audit, logger }) {
  const { profileId, runId } = data;

  await prisma.automationRun.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    const tasks = await prisma.automationTask.findMany({
      where: { profileId },
      orderBy: { order: "asc" },
    });

    for (const t of tasks) {
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
          { profileId, taskId: t.id, nodeId: NODE_ID, error: err.message },
          "worker",
          "ERROR"
        );

        logger.error(`Task ${t.id} failed inside profile ${profileId}`, err);
      }
    }

    await prisma.automationRun.update({
      where: { id: runId },
      data: {
        status: "success",
        finishedAt: new Date(),
      },
    });

    await audit.automation(
      "profile.complete",
      { profileId, runId, nodeId: NODE_ID },
      "worker"
    );
  } catch (err) {
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

async function handleRunSingleTask({ data, prisma, executor, audit }) {
  const { profileId, taskId, runId } = data;

  await prisma.automationRun.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    const task = await prisma.automationTask.findUnique({ where: { id: taskId } });

    const result = await executor.run({
      actionType: task.actionType,
      actionMeta: task.actionMeta || {},
    });

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
      { profileId, taskId, runId, nodeId: NODE_ID, error: err.message },
      "worker",
      "ERROR"
    );

    throw err;
  }
}

module.exports = startWorker;
