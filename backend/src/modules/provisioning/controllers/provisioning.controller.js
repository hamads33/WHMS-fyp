/**
 * Provisioning Controller
 * Path: src/modules/provisioning/controllers/provisioning.controller.js
 */

const provisioningService = require("../services/provisioning.service");
const {
  enqueueProvisionAccount,
  enqueueDeprovisionAccount,
  enqueueProvisionDomain,
  enqueueSuspendAccount,
  enqueueUnsuspendAccount,
  enqueueIssueSSL,
  enqueueCreateDatabase,
  enqueueCreateEmail,
  getJobStatus,
} = require("../queues/provisioning.queue");

async function getOwnedAccountOrThrow(req, username) {
  const account = await provisioningService.getAccountByUsername(username);
  if (account.clientId !== req.user?.id) {
    const err = new Error("Hosting account not found");
    err.statusCode = 404;
    throw err;
  }
  return account;
}

/**
 * Get hosting account for order
 * GET /api/client/provisioning/accounts/:orderId
 */
exports.getAccountByOrder = async (req, res) => {
  try {
    const account = await provisioningService.getAccountByOrderId(
      req.params.orderId
    );
    if (account.clientId !== req.user?.id) {
      return res.status(404).json({ error: "Hosting account not found" });
    }
    res.json(account);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * Get hosting account details
 * GET /api/client/provisioning/accounts/:username
 */
exports.getAccount = async (req, res) => {
  try {
    const account = req.originalUrl?.includes("/api/admin/")
      ? await provisioningService.getAccountByUsername(req.params.username)
      : await getOwnedAccountOrThrow(req, req.params.username);
    res.json(account);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * List all accounts for client
 * GET /api/client/provisioning/accounts
 */
exports.listClientAccounts = async (req, res) => {
  try {
    const accounts = await provisioningService.getClientAccounts(req.user.id);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Provision domain for account
 * POST /api/client/provisioning/accounts/:username/domains
 */
exports.provisionDomain = async (req, res) => {
  try {
    await getOwnedAccountOrThrow(req, req.params.username);
    const domain = await provisioningService.provisionDomain(
      req.params.username,
      req.body
    );
    res.status(201).json(domain);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * Provision email account
 * POST /api/client/provisioning/accounts/:username/emails
 */
exports.provisionEmail = async (req, res) => {
  try {
    await getOwnedAccountOrThrow(req, req.params.username);
    const email = await provisioningService.provisionEmail(
      req.params.username,
      req.body.domain,
      req.body
    );
    res.status(201).json(email);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * Get account usage stats
 * GET /api/client/provisioning/accounts/:username/stats
 */
exports.getAccountStats = async (req, res) => {
  try {
    const account = req.originalUrl?.includes("/api/admin/")
      ? await provisioningService.getAccountByUsername(req.params.username)
      : await getOwnedAccountOrThrow(req, req.params.username);

    // Return stored stats from DB
    res.json({
      username: account.username,
      diskUsedMB: account.diskUsedMB,
      bandwidthUsedGB: account.bandwidthUsedGB,
      status: account.status,
      createdAt: account.provisionedAt,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.issueSSLClient = async (req, res) => {
  try {
    await getOwnedAccountOrThrow(req, req.params.username);
    const result = await provisioningService.issueSSL(req.params.username, req.body.domain);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.createDatabaseClient = async (req, res) => {
  try {
    await getOwnedAccountOrThrow(req, req.params.username);
    const result = await provisioningService.provisionDatabase(
      req.params.username,
      req.body.domain,
      req.body
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

exports.syncOwnedAccountStats = async (req, res) => {
  try {
    await getOwnedAccountOrThrow(req, req.params.username);
    const stats = await provisioningService.syncAccountStats(req.params.username);
    res.json({ message: "Stats synced", stats });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * Sync account stats (admin)
 * POST /api/admin/provisioning/accounts/:username/sync
 */
exports.syncAccountStats = async (req, res) => {
  try {
    const stats = await provisioningService.syncAccountStats(
      req.params.username
    );
    res.json({ message: "Stats synced", stats });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * Manual provisioning trigger (admin)
 * POST /api/admin/provisioning/orders/:orderId/provision
 */
exports.manualProvision = async (req, res) => {
  try {
    const account = await provisioningService.provisionAccount(
      req.params.orderId
    );
    res.status(201).json(account);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * Manual suspend (admin)
 * POST /api/admin/provisioning/accounts/:username/suspend
 */
exports.suspendAccount = async (req, res) => {
  try {
    // Get account to find orderId
    const account = await provisioningService.getAccountByUsername(
      req.params.username
    );

    const updated = await provisioningService.suspendAccount(
      account.orderId,
      req.body.reason || "admin-action"
    );
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * Manual unsuspend (admin)
 * POST /api/admin/provisioning/accounts/:username/unsuspend
 */
exports.unsuspendAccount = async (req, res) => {
  try {
    const account = await provisioningService.getAccountByUsername(
      req.params.username
    );

    const updated = await provisioningService.unsuspendAccount(account.orderId);
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

/**
 * Get all accounts (admin - with pagination)
 * GET /api/admin/provisioning/accounts
 */
exports.adminListAccounts = async (req, res) => {
  try {
    const prisma = require("../../../../prisma");
    const accounts = await prisma.hostingAccount.findMany({
      include: {
        client: { select: { id: true, email: true } },
        order: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: req.query.limit ? parseInt(req.query.limit) : 100,
      skip: req.query.offset ? parseInt(req.query.offset) : 0,
    });

    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Sync all accounts stats (admin cron job)
 * POST /api/admin/provisioning/sync-all
 */
exports.syncAllStats = async (req, res) => {
  try {
    const prisma = require("../../../../prisma");
    const accounts = await prisma.hostingAccount.findMany({
      where: { status: "active" },
    });

    const results = {
      total: accounts.length,
      synced: 0,
      failed: 0,
      errors: [],
    };

    for (const account of accounts) {
      try {
        await provisioningService.syncAccountStats(account.username);
        results.synced++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          username: account.username,
          error: err.message,
        });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Async provision account (queued)
 * POST /api/admin/provisioning/orders/:orderId/provision-async
 */
exports.provisionAccountAsync = async (req, res) => {
  try {
    const job = await enqueueProvisionAccount(req.params.orderId);
    res.status(202).json({
      message: "Provisioning job queued",
      jobId: job.id,
      status: "queued",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get provisioning job status
 * GET /api/admin/provisioning/jobs/:jobId
 */
exports.getProvisioningStatus = async (req, res) => {
  try {
    const status = await getJobStatus(req.params.jobId);
    if (!status) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Async suspend account (queued)
 * POST /api/admin/provisioning/orders/:orderId/suspend-async
 */
exports.suspendAccountAsync = async (req, res) => {
  try {
    const job = await enqueueSuspendAccount(
      req.params.orderId,
      req.body.reason || "admin-action"
    );
    res.status(202).json({
      message: "Suspend job queued",
      jobId: job.id,
      status: "queued",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Async unsuspend account (queued)
 * POST /api/admin/provisioning/orders/:orderId/unsuspend-async
 */
exports.unsuspendAccountAsync = async (req, res) => {
  try {
    const job = await enqueueUnsuspendAccount(req.params.orderId);
    res.status(202).json({
      message: "Unsuspend job queued",
      jobId: job.id,
      status: "queued",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Async provision domain (queued)
 * POST /api/admin/provisioning/accounts/:username/domains-async
 */
exports.provisionDomainAsync = async (req, res) => {
  try {
    const job = await enqueueProvisionDomain(req.params.username, req.body.domain, {
      ip: req.body.ip,
      ns1: req.body.ns1,
      ns2: req.body.ns2,
    });
    res.status(202).json({
      message: "Domain provision job queued",
      jobId: job.id,
      status: "queued",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Test CyberPanel SSH connection
 * GET /api/admin/provisioning/test-connection
 */
exports.testCyberPanelConnection = async (req, res) => {
  try {
    const settingsService = require("../../settings/settings.service");
    const result = await settingsService.testCyberPanelConnection();
    res.json({ connected: true, ...result });
  } catch (err) {
    res.status(503).json({ connected: false, error: err.message });
  }
};

/**
 * Issue SSL for a domain (queued)
 * POST /api/admin/provisioning/accounts/:username/ssl
 */
exports.issueSSLAsync = async (req, res) => {
  try {
    const job = await enqueueIssueSSL(req.params.username, req.body.domain);
    res.status(202).json({ message: "SSL job queued", jobId: job.id, status: "queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create database (queued)
 * POST /api/admin/provisioning/accounts/:username/databases-async
 */
exports.createDatabaseAsync = async (req, res) => {
  try {
    const job = await enqueueCreateDatabase(req.params.username, req.body.domain, req.body);
    res.status(202).json({ message: "Database job queued", jobId: job.id, status: "queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create email (queued)
 * POST /api/admin/provisioning/accounts/:username/emails-async
 */
exports.createEmailAsync = async (req, res) => {
  try {
    const job = await enqueueCreateEmail(req.params.username, req.body.domain, req.body);
    res.status(202).json({ message: "Email job queued", jobId: job.id, status: "queued" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
