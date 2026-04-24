/**
 * Provisioning Queue (BullMQ)
 * Path: src/modules/provisioning/queues/provisioning.queue.js
 *
 * All provisioning operations are async and queued here.
 * The worker (provisioning.worker.js) processes jobs and calls CyberPanel via SSH.
 *
 * Job types:
 *   create_account   – creates HostingAccount DB record
 *   deprovision_account – deletes website(s) from CyberPanel and marks account deleted
 *   create_domain    – runs `cyberpanel createWebsite` for a given domain
 *   suspend_account  – suspends all websites for an account
 *   unsuspend_account – unsuspends all websites for an account
 *   issue_ssl        – runs `cyberpanel issueSSL` for a domain
 *   create_database  – runs `cyberpanel createDatabase`
 *   create_email     – runs `cyberpanel createEmail`
 */

const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
});

const provisioningQueue = new Queue('provisioning', {
  connection,
  defaultJobOptions: {
    removeOnComplete: { age: 86400, count: 500 }, // keep 24h or 500 jobs
    removeOnFail: false,
  },
});

const DEFAULT_BACKOFF = { type: 'exponential', delay: 3000 };

// ── Enqueue helpers ───────────────────────────────────────────────────────────

async function enqueueProvisionAccount(orderId, payload = {}) {
  const jobId = `provision-${orderId}`;
  return provisioningQueue.add(
    jobId,
    { type: 'create_account', orderId, ...payload },
    { jobId, attempts: 3, backoff: DEFAULT_BACKOFF }
  );
}

async function enqueueDeprovisionAccount(orderId, payload = {}) {
  const jobId = `deprovision-${orderId}`;
  return provisioningQueue.add(
    jobId,
    { type: 'deprovision_account', orderId, ...payload },
    { jobId, attempts: 2, backoff: DEFAULT_BACKOFF }
  );
}

async function enqueueProvisionDomain(username, domain, payload = {}) {
  const jobId = `domain-${username}-${domain}`;
  return provisioningQueue.add(
    jobId,
    { type: 'create_domain', username, domain, ...payload },
    { jobId, attempts: 3, backoff: DEFAULT_BACKOFF }
  );
}

async function enqueueSuspendAccount(orderId, reason = 'non-payment') {
  const jobId = `suspend-${orderId}`;
  return provisioningQueue.add(
    jobId,
    { type: 'suspend_account', orderId, reason },
    { jobId, attempts: 2, backoff: DEFAULT_BACKOFF }
  );
}

async function enqueueUnsuspendAccount(orderId) {
  const jobId = `unsuspend-${orderId}`;
  return provisioningQueue.add(
    jobId,
    { type: 'unsuspend_account', orderId },
    { jobId, attempts: 2, backoff: DEFAULT_BACKOFF }
  );
}

async function enqueueIssueSSL(username, domain) {
  const jobId = `ssl-${username}-${domain}`;
  return provisioningQueue.add(
    jobId,
    { type: 'issue_ssl', username, domain },
    { jobId, attempts: 3, backoff: { type: 'exponential', delay: 10000 } }
  );
}

async function enqueueCreateDatabase(username, domain, dbData) {
  const jobId = `db-${username}-${dbData.name}`;
  return provisioningQueue.add(
    jobId,
    { type: 'create_database', username, domain, dbData },
    { jobId, attempts: 2, backoff: DEFAULT_BACKOFF }
  );
}

async function enqueueCreateEmail(username, domain, emailData) {
  const jobId = `email-${username}-${emailData.account}@${domain}`;
  return provisioningQueue.add(
    jobId,
    { type: 'create_email', username, domain, emailData },
    { jobId, attempts: 2, backoff: DEFAULT_BACKOFF }
  );
}

async function getJobStatus(jobId) {
  const job = await provisioningQueue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  const logsResult = await job.getLogs();
  
  // Create mock steps based on progress
  const progress = job.progress || 0;
  const steps = [
    { id: "init", name: "Initialize Provisioning", status: progress > 0 ? "completed" : "pending" },
    { id: "exec", name: "Execute Operation", status: progress >= 100 ? "completed" : (progress > 10 ? "in_progress" : "pending") },
    { id: "verify", name: "Verify Deployment", status: state === "completed" ? "completed" : "pending" }
  ];

  if (state === "failed") {
    steps.forEach(s => {
      if (s.status === "in_progress" || s.status === "pending") s.status = "failed";
    });
  }

  return {
    jobId: job.id,
    status: state,
    progress: progress,
    attempts: job.attemptsMade,
    data: job.data,
    failedReason: job.failedReason,
    logs: logsResult?.logs || [],
    steps: steps,
  };
}

module.exports = {
  provisioningQueue,
  connection,
  enqueueProvisionAccount,
  enqueueDeprovisionAccount,
  enqueueProvisionDomain,
  enqueueSuspendAccount,
  enqueueUnsuspendAccount,
  enqueueIssueSSL,
  enqueueCreateDatabase,
  enqueueCreateEmail,
  getJobStatus,
};
