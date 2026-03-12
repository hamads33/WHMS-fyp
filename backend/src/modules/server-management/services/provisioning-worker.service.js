const jobRepo = require("../repositories/provisioning-job.repository");
const accountRepo = require("../repositories/server-account.repository");
const serverLogRepo = require("../repositories/server-log.repository");
const { resolveDriver } = require("../drivers");
const webhookService = require("./webhook.service");

const MAX_ATTEMPTS = 3;
const POLL_INTERVAL_MS = 5000;

let _running = false;
let _timer = null;

async function _processJob(job) {
  await jobRepo.update(job.id, {
    status: "running",
    attempts: job.attempts + 1,
  });

  try {
    const driver = resolveDriver(job.server);

    switch (job.type) {
      case "create_account": {
        const { userId, domain, username, password } = job.payload;
        await driver.createAccount({ domain, username, password });
        const account = await accountRepo.create({ serverId: job.serverId, userId, domain, status: "active" });
        await serverLogRepo.create({
          serverId: job.serverId,
          action: "ACCOUNT_PROVISIONED",
          message: `[Queue] Account created for domain "${domain}"`,
        });
        webhookService.emit("ACCOUNT_CREATED", { serverId: job.serverId, account });
        break;
      }

      case "suspend_account": {
        const { accountId, domain } = job.payload;
        await driver.suspendAccount(domain);
        const account = await accountRepo.update(accountId, { status: "suspended" });
        await serverLogRepo.create({
          serverId: job.serverId,
          action: "ACCOUNT_PROVISIONED",
          message: `[Queue] Account "${domain}" suspended`,
        });
        webhookService.emit("ACCOUNT_SUSPENDED", { serverId: job.serverId, account });
        break;
      }

      case "terminate_account": {
        const { accountId, domain } = job.payload;
        await driver.terminateAccount(domain);
        const account = await accountRepo.update(accountId, { status: "terminated" });
        await serverLogRepo.create({
          serverId: job.serverId,
          action: "ACCOUNT_PROVISIONED",
          message: `[Queue] Account "${domain}" terminated`,
        });
        webhookService.emit("ACCOUNT_TERMINATED", { serverId: job.serverId, account });
        break;
      }

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await jobRepo.update(job.id, {
      status: "completed",
      completedAt: new Date(),
    });
  } catch (e) {
    const attempts = job.attempts + 1;
    const failed = attempts >= MAX_ATTEMPTS;
    await jobRepo.update(job.id, {
      status: failed ? "failed" : "pending",
      lastError: e.message,
    });
    if (failed) {
      await serverLogRepo.create({
        serverId: job.serverId,
        action: "ACCOUNT_PROVISIONED",
        message: `[Queue] Job ${job.id} failed after ${attempts} attempts: ${e.message}`,
      });
    }
  }
}

async function _tick() {
  if (_running) return;
  _running = true;
  try {
    const pending = await jobRepo.findPending();
    for (const job of pending) {
      await _processJob(job);
    }
    // pick up previously-failed jobs that still have retries left
    const retryable = await jobRepo.findFailed();
    for (const job of retryable) {
      if (job.attempts < MAX_ATTEMPTS) {
        await _processJob(job);
      }
    }
  } catch (e) {
    console.error("[ProvisioningWorker] tick error:", e.message);
  } finally {
    _running = false;
  }
}

function start() {
  if (_timer) return;
  _timer = setInterval(_tick, POLL_INTERVAL_MS);
  _tick(); // run immediately on startup
  console.log(`[ProvisioningWorker] Started (poll every ${POLL_INTERVAL_MS}ms)`);
}

function stop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = { start, stop };
