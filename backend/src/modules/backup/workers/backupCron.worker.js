/**
 * Worker for backup jobs - BullMQ v5 compatible
 */

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,  // REQUIRED BY BULLMQ 5
});


// VALID name (no colon)
const queueName = 'backup_run';

// Create queue
const backupQueue = new Queue(queueName, { connection });

// Create worker
const worker = new Worker(
  queueName,
  async (job) => {
    const { backupId } = job.data;
    console.log('Running backup job:', backupId);

    const BackupService = require('../services/backup.service');
    await BackupService.processBackupJob(backupId);
  },
  {
    connection,
    concurrency: 2,
  }
);

worker.on('completed', (job) => {
  console.log(`Backup job completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`Backup job failed: ${job.id}`, err);
});

// ENQUEUE FUNCTION
async function enqueueBackupJob(backupId, opts = {}) {
  await backupQueue.add(
    'run', // job name
    { backupId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      ...opts,
    }
  );
}

module.exports = {
  enqueueBackupJob,
  workerInstance: worker
};
