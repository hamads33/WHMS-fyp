const provisioningService = require("../services/server-provisioning.service");
const queueService = require("../services/provisioning-queue.service");
const accountRepo = require("../repositories/server-account.repository");
const serverLogRepo = require("../repositories/server-log.repository");

// Enqueue instead of provisioning synchronously
exports.createAccount = async (req, res) => {
  try {
    const job = await queueService.enqueueCreateAccount({
      serverId: req.params.id,
      ...req.body,
    });
    res.status(202).json({ jobId: job.id, status: job.status, message: "Account creation queued" });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.suspendAccount = async (req, res) => {
  try {
    const account = await accountRepo.findById(req.params.accountId);
    if (!account) return res.status(404).json({ error: "Account not found" });

    const job = await queueService.enqueueSuspendAccount({
      serverId: account.serverId,
      accountId: account.id,
      domain: account.domain,
    });
    res.json({ jobId: job.id, status: job.status, message: "Suspension queued" });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.terminateAccount = async (req, res) => {
  try {
    const account = await accountRepo.findById(req.params.accountId);
    if (!account) return res.status(404).json({ error: "Account not found" });

    const job = await queueService.enqueueTerminateAccount({
      serverId: account.serverId,
      accountId: account.id,
      domain: account.domain,
    });
    res.json({ jobId: job.id, status: job.status, message: "Termination queued" });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.listAccountsByServer = async (req, res) => {
  try {
    const accounts = await provisioningService.listAccountsByServer(req.params.id);
    res.json({ data: accounts, total: accounts.length });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const { action, limit } = req.query;
    const logs = await serverLogRepo.findByServer(req.params.id, {
      action,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({ data: logs, total: logs.length });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.getAllLogs = async (req, res) => {
  try {
    const { action, limit } = req.query;
    const logs = await serverLogRepo.findAll({
      action,
      limit: limit ? parseInt(limit, 10) : 100,
    });
    res.json({ data: logs, total: logs.length });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};
