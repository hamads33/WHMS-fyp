const prisma = require("../../../../prisma");

const include = { servers: true };

async function findAll() {
  return prisma.serverGroup.findMany({
    include,
    orderBy: { createdAt: "desc" },
  });
}

async function findById(id) {
  return prisma.serverGroup.findUnique({ where: { id }, include });
}

async function findByName(name) {
  return prisma.serverGroup.findUnique({ where: { name } });
}

async function create(data) {
  return prisma.serverGroup.create({ data, include });
}

async function update(id, data) {
  return prisma.serverGroup.update({ where: { id }, data, include });
}

async function remove(id) {
  return prisma.serverGroup.delete({ where: { id } });
}

module.exports = { findAll, findById, findByName, create, update, remove };
