const prisma = require("../../../../prisma");

const include = {
  server: { select: { id: true, name: true, hostname: true, type: true } },
};

async function create(data) {
  return prisma.serverManagedAccount.create({ data, include });
}

async function findByServer(serverId) {
  return prisma.serverManagedAccount.findMany({
    where: { serverId },
    include,
    orderBy: { createdAt: "desc" },
  });
}

async function findByUser(userId) {
  return prisma.serverManagedAccount.findMany({
    where: { userId },
    include,
    orderBy: { createdAt: "desc" },
  });
}

async function findById(id) {
  return prisma.serverManagedAccount.findUnique({ where: { id }, include });
}

async function update(id, data) {
  return prisma.serverManagedAccount.update({ where: { id }, data, include });
}

module.exports = { create, findByServer, findByUser, findById, update };
