// src/modules/automation/repositories/log.repo.js
// Prisma-backed Run repository (keeps your existing implementation)

const prisma = require('../../../lib/prisma');

async function createRun(runData) {
  return prisma.run.create({ data: runData });
}

async function updateRun(id, data) {
  return prisma.run.update({ where: { id: Number(id) }, data });
}

async function getRuns(filter = {}) {
  const where = {};
  if (filter.taskId) where.taskId = Number(filter.taskId);
  if (filter.status) where.status = filter.status;
  return prisma.run.findMany({ where, orderBy: { startedAt: 'desc' }, take: filter.limit || 100 });
}

module.exports = { createRun, updateRun, getRuns };
