/**
 * Provisioning Worker (BullMQ)
 * Path: src/modules/provisioning/workers/provisioning.worker.js
 *
 * Processes async provisioning jobs. Calls CyberPanel via SSH through
 * the provisioning service. Each job type maps 1:1 to a service method.
 *
 * Retry policy: configured per job in the queue (exponential backoff).
 * Dead-letter: BullMQ keeps failed jobs in Redis; monitor via Bull Board.
 *
 * Idempotency: each job has a stable jobId (e.g. "provision-<orderId>")
 * so re-queuing the same operation is a no-op.
 */

const { Worker } = require('bullmq');
const { connection } = require('../queues/provisioning.queue');
const provisioningService = require('../services/provisioning.service');
const prisma = require('../../../../prisma');

const CONCURRENCY = Number(process.env.PROVISIONING_WORKER_CONCURRENCY || 2);

const worker = new Worker(
  'provisioning',
  async (job) => {
    const { type, orderId, username, domain, reason, dbData, emailData } = job.data;
    const logMsg = (msg) => `[provisioning-worker] job=${job.id} type=${type} — ${msg}`;
    console.log(logMsg('started'));
    await job.log(`Starting provisioning job: ${type}`);
    await job.updateProgress(10);

    // Track attempt count in DB for ProvisioningJob if serverId is available
    // (ProvisioningJob rows are created by the API before enqueuing)

    let result;

    switch (type) {
      case 'create_account':
        result = await provisioningService.provisionAccount(orderId);
        break;

      case 'deprovision_account':
        result = await provisioningService.deprovisionAccount(orderId);
        break;

      case 'create_domain':
        result = await provisioningService.provisionDomain(username, {
          domain,
          phpVersion: job.data.phpVersion,
          package: job.data.package,
        });
        break;

      case 'suspend_account':
        result = await provisioningService.suspendAccount(orderId, reason);
        break;

      case 'unsuspend_account':
        result = await provisioningService.unsuspendAccount(orderId);
        break;

      case 'issue_ssl':
        result = await provisioningService.issueSSL(username, domain);
        break;

      case 'create_database':
        result = await provisioningService.provisionDatabase(username, domain, dbData);
        break;

      case 'create_email':
        result = await provisioningService.provisionEmail(username, domain, emailData);
        break;

      default:
        throw new Error(`Unknown provisioning job type: "${type}"`);
    }

    await job.updateProgress(100);
    await job.log(`Successfully completed job: ${type}`);
    console.log(logMsg('completed'));

    if (global.io) {
      global.io.emit('provisioning:completed', {
        jobId: job.id,
        type,
        orderId,
        result,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  },
  { connection, concurrency: CONCURRENCY }
);

worker.on('failed', async (job, err) => {
  console.error(`[provisioning-worker] job=${job?.id} failed (attempt ${job?.attemptsMade}):`, err?.message);

  // Update order provisioning status on final failure
  const orderId = job?.data?.orderId;
  if (orderId && job.attemptsMade >= job.opts?.attempts) {
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: { provisioningStatus: 'failed', provisioningError: err.message },
      });
    } catch { /* order may not exist */ }
  }

  if (global.io) {
    global.io.emit('provisioning:failed', {
      jobId: job?.id,
      type: job?.data?.type,
      orderId,
      error: err?.message,
      attemptsMade: job?.attemptsMade,
      timestamp: new Date().toISOString(),
    });
  }
});

worker.on('error', (err) => {
  console.error('[provisioning-worker] Worker error:', err);
});

module.exports = worker;
