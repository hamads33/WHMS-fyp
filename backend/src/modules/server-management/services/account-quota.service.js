const accountRepo = require("../repositories/server-account.repository");
const serverRepo = require("../repositories/server.repository");
const { resolveDriver } = require("../drivers");

function err(msg, code = 400) {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
}

async function getUsage(accountId) {
  const account = await accountRepo.findById(accountId);
  if (!account) throw err("Account not found", 404);

  const server = await serverRepo.findById(account.serverId);
  if (!server) throw err("Server not found", 404);

  const driver = resolveDriver(server);
  const usage = await driver.getAccountUsage(account.domain);

  // Persist latest usage
  const updated = await accountRepo.update(accountId, {
    diskUsedMB: usage.diskUsedMB,
    bandwidthUsedMB: usage.bandwidthUsedMB,
    databaseUsed: usage.databaseUsed,
    emailUsed: usage.emailUsed,
    lastUsageSyncAt: new Date(),
  });

  return {
    accountId: account.id,
    domain: account.domain,
    quotas: {
      diskLimitMB: account.diskLimitMB,
      bandwidthLimitMB: account.bandwidthLimitMB,
      databaseLimit: account.databaseLimit,
      emailLimit: account.emailLimit,
    },
    usage: {
      diskUsedMB: usage.diskUsedMB,
      bandwidthUsedMB: usage.bandwidthUsedMB,
      databaseUsed: usage.databaseUsed,
      emailUsed: usage.emailUsed,
    },
    percentages: {
      disk: parseFloat(((usage.diskUsedMB / account.diskLimitMB) * 100).toFixed(1)),
      bandwidth: parseFloat(((usage.bandwidthUsedMB / account.bandwidthLimitMB) * 100).toFixed(1)),
      databases: parseFloat(((usage.databaseUsed / account.databaseLimit) * 100).toFixed(1)),
      email: parseFloat(((usage.emailUsed / account.emailLimit) * 100).toFixed(1)),
    },
    lastSyncedAt: updated.lastUsageSyncAt,
  };
}

async function updateQuotas(accountId, quotas) {
  const account = await accountRepo.findById(accountId);
  if (!account) throw err("Account not found", 404);
  return accountRepo.update(accountId, quotas);
}

module.exports = { getUsage, updateQuotas };
