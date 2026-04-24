// src/modules/backup/worker/queue.js
const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null});
const backupQueue = new Queue("backup_run", { connection });

async function enqueueBackupJob(backupId, payload = {}) {
  await backupQueue.add(`backup-${backupId}`, { backupId, ...payload }, {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false
  });
}

module.exports = { backupQueue, enqueueBackupJob, connection };
