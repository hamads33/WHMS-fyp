// src/modules/backup/worker/runner.js

// 🔴 IMPORTANT: Register backup providers in worker process
require("../bootstrap");

const { Worker } = require("bullmq");
const { connection } = require("./queue");
const { performBackupJob } = require("../backup.manager");

const concurrency = Number(process.env.BACKUP_WORKER_CONCURRENCY || 2);

const worker = new Worker(
  "backup_run",
  async (job) => {
    const { backupId, ...payload } = job.data;
    return performBackupJob(backupId, payload);
  },
  { connection, concurrency }
);

worker.on("completed", (job) => {
  console.log(`[backup-runner] completed job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(
    `[backup-runner] job ${job.id} failed:`,
    err?.message || err
  );
});

worker.on("error", (err) => {
  console.error("[backup-runner] worker error:", err);
});

module.exports = worker;
