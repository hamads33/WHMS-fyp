const commandRepo = require('./command.repository');
const tenantService = require('../tenant/tenant.service');
const { commandQueue } = require('../../queues/command.queue');

async function issueCommand(adminUserId, tenantId, type, payload) {
  await tenantService.getById(tenantId);

  const command = await commandRepo.create(tenantId, type, payload, adminUserId);

  await commandQueue.add(
    'track',
    { commandId: command.id, tenantId, type },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );

  return command;
}

async function getCommandsForTenant(tenantId, options) {
  return commandRepo.listByTenantId(tenantId, options);
}

async function getById(id) {
  const command = await commandRepo.findById(id);
  if (!command) {
    const err = new Error('Command not found');
    err.status = 404;
    throw err;
  }
  return command;
}

async function listAll(options) {
  return commandRepo.listAll(options);
}

module.exports = { issueCommand, getCommandsForTenant, getById, listAll };
