const serverRepo = require("../repositories/server.repository");
const serverLogRepo = require("../repositories/server-log.repository");
const webhookService = require("./webhook.service");
const { resolveDriver } = require("../drivers");

function notFound(msg = "Server not found") {
  const e = new Error(msg);
  e.statusCode = 404;
  return e;
}

async function listServers(filters) {
  return serverRepo.findAll(filters);
}

async function getServer(id) {
  const server = await serverRepo.findById(id);
  if (!server) throw notFound();
  return server;
}

async function createServer(data) {
  const server = await serverRepo.create(data);
  await serverLogRepo.create({
    serverId: server.id,
    action: "SERVER_CREATED",
    message: `Server "${server.name}" created (${server.type})`,
  });
  webhookService.emit("SERVER_ADDED", { server: { id: server.id, name: server.name, type: server.type } });
  return server;
}

async function getCapabilities(id) {
  const server = await getServer(id);
  const driver = resolveDriver(server);
  return { serverId: id, capabilities: driver.getCapabilities() };
}

async function updateServer(id, data) {
  await getServer(id);
  const server = await serverRepo.update(id, data);
  await serverLogRepo.create({
    serverId: server.id,
    action: "SERVER_UPDATED",
    message: `Server "${server.name}" updated`,
  });
  return server;
}

async function deleteServer(id) {
  await getServer(id);
  return serverRepo.remove(id);
}

async function testConnection(id) {
  const server = await getServer(id);
  const driver = resolveDriver(server);
  const start = Date.now();
  const result = await driver.testConnection();
  const latency = Date.now() - start;

  await serverLogRepo.create({
    serverId: server.id,
    action: "CONNECTION_TESTED",
    message: `Connection test: ${result.status} (${latency}ms)`,
  });

  return { ...result, latency };
}

async function getMetrics(id) {
  const server = await getServer(id);
  const driver = resolveDriver(server);
  return driver.getMetrics();
}

async function setMaintenanceMode(id, enabled) {
  await getServer(id);
  const status = enabled ? "maintenance" : "active";
  const server = await serverRepo.update(id, { status });
  await serverLogRepo.create({
    serverId: server.id,
    action: "SERVER_UPDATED",
    message: `Server "${server.name}" set to ${status}`,
  });
  return server;
}

module.exports = {
  listServers,
  getServer,
  createServer,
  getCapabilities,
  updateServer,
  deleteServer,
  testConnection,
  getMetrics,
  setMaintenanceMode,
};
