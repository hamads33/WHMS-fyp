const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null});
const backupQueue = new Queue('backup_run', { connection });

/**
 * scheduleRecurringBackup(cronExpr, backupPayload)
 * returns jobId (repeatable job key)
 */
async function scheduleRecurringBackup(cronExpr, payload, opts = {}) {
  const jobName = opts.name || `recurring:${Date.now()}`;
  await backupQueue.add(jobName, payload, {
    repeat: { cron: cronExpr },
    removeOnComplete: true,
    ...opts
  });
  return { success: true, message: 'scheduled' };
}

// Remove schedule: must know repeatable job key
async function removeSchedule(jobName) {
  await backupQueue.removeRepeatable(jobName);
}

module.exports = { scheduleRecurringBackup, removeSchedule, backupQueue };
