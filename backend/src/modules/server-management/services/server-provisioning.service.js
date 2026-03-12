const serverRepo = require("../repositories/server.repository");
const accountRepo = require("../repositories/server-account.repository");
const serverLogRepo = require("../repositories/server-log.repository");
const { resolveDriver } = require("../drivers");

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
      `Provisioning blocked: server is "${server.status}". Only active servers accept provisioning.`,
      409
    );
  }
  return server;
}

async function createAccount({ serverId, userId, domain, username, password }) {
  const server = await _requireActiveServer(serverId);
  const driver = resolveDriver(server);

  const result = await driver.createAccount({ domain, username, password });

  const account = await accountRepo.create({
    serverId,
    userId,
    domain,
    status: "active",
  });

  await serverLogRepo.create({
    serverId,
    action: "ACCOUNT_PROVISIONED",
    message: `Account created for domain "${domain}" on server "${server.name}"`,
  });

  return { account, driverResult: result.account };
}

async function suspendAccount(accountId) {
  const account = await accountRepo.findById(accountId);
  if (!account) throw err("Account not found", 404);

  const server = await serverRepo.findById(account.serverId);
  if (!server) throw err("Server not found", 404);

  const driver = resolveDriver(server);
  const result = await driver.suspendAccount(account.domain);

  const updated = await accountRepo.update(accountId, { status: "suspended" });

  await serverLogRepo.create({
    serverId: server.id,
    action: "ACCOUNT_PROVISIONED",
    message: `Account for "${account.domain}" suspended`,
  });

  return { account: updated, driverResult: result };
}

async function terminateAccount(accountId) {
  const account = await accountRepo.findById(accountId);
  if (!account) throw err("Account not found", 404);

  const server = await serverRepo.findById(account.serverId);
  if (!server) throw err("Server not found", 404);

  const driver = resolveDriver(server);
  const result = await driver.terminateAccount(account.domain);

  const updated = await accountRepo.update(accountId, { status: "terminated" });

  await serverLogRepo.create({
    serverId: server.id,
    action: "ACCOUNT_PROVISIONED",
    message: `Account for "${account.domain}" terminated`,
  });

  return { account: updated, driverResult: result };
}

async function listAccountsByServer(serverId) {
  return accountRepo.findByServer(serverId);
}

async function listAccountsByUser(userId) {
  return accountRepo.findByUser(userId);
}

module.exports = {
  createAccount,
  suspendAccount,
  terminateAccount,
  listAccountsByServer,
  listAccountsByUser,
};
