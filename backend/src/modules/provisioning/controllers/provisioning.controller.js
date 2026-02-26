/**
 * Provisioning Controller
 * Path: src/modules/provisioning/controllers/provisioning.controller.js
 */

const provisioningService = require("../services/provisioning.service");

/**
 * Get hosting account for order
 * GET /api/client/provisioning/accounts/:orderId
 */
exports.getAccountByOrder = async (req, res) => {
  try {
    const account = await provisioningService.getAccountByOrderId(
      req.params.orderId
    );
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
    const account = await provisioningService.getAccountByUsername(
      req.params.username
    );
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
    const account = await provisioningService.getAccountByUsername(
      req.params.username
    );

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