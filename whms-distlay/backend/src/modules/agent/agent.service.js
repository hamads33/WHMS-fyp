const agentRepo = require('./agent.repository');
const commandRepo = require('../command/command.repository');

async function heartbeat(agent, { status, uptime, hostname, metadata }) {
  const updated = await agentRepo.updateHeartbeat(
    agent.id,
    status || 'online',
    uptime || 0,
    hostname || agent.hostname,
    metadata || {}
  );
  return updated;
}

async function getPendingCommands(agent) {
  const commands = await commandRepo.findPendingByTenantId(agent.tenant_id);

  if (commands.length) {
    await commandRepo.markDispatched(commands.map((c) => c.id));
  }

  return commands;
}

async function submitResult(agent, { command_id, success, output }) {
  const command = await commandRepo.findById(command_id);
  if (!command || command.tenant_id !== agent.tenant_id) {
    const err = new Error('Command not found');
    err.status = 404;
    throw err;
  }

  return commandRepo.markExecuted(command_id, success, output);
}

module.exports = { heartbeat, getPendingCommands, submitResult };
