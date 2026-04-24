const prisma = require("../../../../prisma");

async function findAll({ isActive } = {}) {
  return prisma.serverWebhook.findMany({
    where: { ...(isActive !== undefined && { isActive }) },
    orderBy: { createdAt: "desc" },
  });
}

async function findById(id) {
  return prisma.serverWebhook.findUnique({ where: { id } });
}

async function findByEvent(event) {
  return prisma.serverWebhook.findMany({
    where: { isActive: true, events: { has: event } },
  });
}

async function create(data) {
  return prisma.serverWebhook.create({ data });
}

async function update(id, data) {
  return prisma.serverWebhook.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.serverWebhook.delete({ where: { id } });
}

module.exports = { findAll, findById, findByEvent, create, update, remove };
