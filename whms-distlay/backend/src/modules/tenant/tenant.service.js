const tenantRepo = require('./tenant.repository');

const VALID_STATUSES = ['pending', 'active', 'suspended'];

async function createForUser(userId) {
  return tenantRepo.create(userId);
}

async function getForCurrentUser(userId) {
  const tenant = await tenantRepo.findByUserId(userId);
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.status = 404;
    throw err;
  }
  return tenant;
}

async function getById(id) {
  const tenant = await tenantRepo.findById(id);
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.status = 404;
    throw err;
  }
  return tenant;
}

async function updateStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.status = 400;
    throw err;
  }
  const tenant = await tenantRepo.updateStatus(id, status);
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.status = 404;
    throw err;
  }
  return tenant;
}

async function listAll(query) {
  return tenantRepo.listAll(query);
}

module.exports = { createForUser, getForCurrentUser, getById, updateStatus, listAll };
