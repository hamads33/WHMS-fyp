const installerRepo = require('./installer.repository');
const agentRepo = require('../agent/agent.repository');
const tenantService = require('../tenant/tenant.service');
const { generateSecureToken } = require('../../common/utils/crypto');
const config = require('../../config');

async function generateInstallToken(userId) {
  const tenant = await tenantService.getForCurrentUser(userId);

  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + config.installTokenTtl * 1000);

  const record = await installerRepo.createToken(tenant.id, token, expiresAt);
  return record;
}

async function validateToken(token) {
  const record = await installerRepo.findToken(token);

  if (!record) {
    const err = new Error('Invalid token');
    err.status = 401;
    throw err;
  }

  if (record.used) {
    const err = new Error('Token already used');
    err.status = 410;
    throw err;
  }

  if (new Date(record.expires_at) < new Date()) {
    const err = new Error('Token expired');
    err.status = 410;
    throw err;
  }

  if (record.tenant_status === 'suspended') {
    const err = new Error('Tenant is suspended');
    err.status = 403;
    throw err;
  }

  await installerRepo.markUsed(token);

  const agentToken = generateSecureToken(40);
  const agent = await agentRepo.provision(record.tenant_id, agentToken);

  return { agent_token: agent.token, tenant_id: record.tenant_id };
}

module.exports = { generateInstallToken, validateToken };
