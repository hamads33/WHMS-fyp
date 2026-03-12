const jobRepo = require("../repositories/provisioning-job.repository");
const serverRepo = require("../repositories/server.repository");

function err(msg, code = 400) {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
}

async function _requireActiveServer(serverId) {
  const server = await serverRepo.findById(serverId);
  if (!server) throw err("Server not found", 404);
  if (server.status !== "active") {
    throw err(
      `Provisioning blocked: server is "${server.status}". Only active servers accept jobs.`,
      409
    );
  }
  return server;
}

async function enqueueCreateAccount({ serverId, userId, domain, username, password }) {
  await _requireActiveServer(serverId);
  return jobRepo.create({
    serverId,
    type: "create_account",
    payload: { userId, domain, username, password },
    status: "pending",
  });
}

async function enqueueSuspendAccount({ serverId, accountId, domain }) {
  return jobRepo.create({
    serverId,
    type: "suspend_account",
    payload: { accountId, domain },
    status: "pending",
  });
}

async function enqueueTerminateAccount({ serverId, accountId, domain }) {
  return jobRepo.create({
    serverId,
    type: "terminate_account",
    payload: { accountId, domain },
    status: "pending",
  });
}

async function listJobs(filters) {
  return jobRepo.findAll(filters);
}

async function getJob(id) {
  const job = await jobRepo.findById(id);
  if (!job) throw err("Provisioning job not found", 404);
  return job;
}

async function retryJob(id) {
  const job = await getJob(id);
  if (job.status !== "failed") {
    throw err("Only failed jobs can be retried", 400);
  }
  if (job.attempts >= 3) {
    throw err("Job has exceeded maximum retry attempts (3)", 400);
  }
  return jobRepo.update(id, { status: "pending", lastError: null });
}

module.exports = {
  enqueueCreateAccount,
  enqueueSuspendAccount,
  enqueueTerminateAccount,
  listJobs,
  getJob,
  retryJob,
};
