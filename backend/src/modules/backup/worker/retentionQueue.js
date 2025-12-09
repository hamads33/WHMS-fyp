// src/modules/backup/worker/retentionQueue.js
const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });
const retentionQueue = new Queue("backup_retention", { connection });

async function scheduleDailyRetention() {
  // Use cron to run once a day at 02:00
  await retentionQueue.add("retention-daily", {}, {
    repeat: { cron: process.env.RETENTION_CRON || "0 2 * * *" },
    removeOnComplete: true
  });
}

module.exports = { retentionQueue, scheduleDailyRetention, connection };
