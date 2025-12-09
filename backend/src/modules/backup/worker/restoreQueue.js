// src/modules/backup/worker/restoreQueue.js
const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });
const restoreQueue = new Queue("backup_restore", { connection });

const { performRestoreJob } = require("./restoreRunner"); // worker logic below

async function enqueueRestoreJob(backupId, payload = {}) {
  const job = await restoreQueue.add(`restore-${backupId}-${Date.now()}`, { backupId, ...payload }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 * 2 },
    removeOnComplete: true
  });
  return job.id;
}

// Worker instance for restores
const restoreWorker = new Worker("backup_restore", async (job) => {
  const { backupId, ...payload } = job.data;
  return performRestoreJob(backupId, payload);
}, { connection, concurrency: Number(process.env.RESTORE_WORKER_CONCURRENCY || 1) });

restoreWorker.on("completed", (job) => {
  console.log("[restore-worker] completed", job.id);
});
restoreWorker.on("failed", (job, err) => {
  console.error("[restore-worker] failed", job.id, err?.message || err);
});

module.exports = { enqueueRestoreJob, restoreQueue, restoreWorker };
