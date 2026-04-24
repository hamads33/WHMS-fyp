const prisma = require("../../../../prisma");

const include = { group: true };

async function findAll({ groupId, status, type } = {}) {
  return prisma.server.findMany({
    where: {
      ...(groupId && { groupId }),
      ...(status && { status }),
      ...(type && { type }),
    },
    include,
    orderBy: { createdAt: "desc" },
  });
}

async function findById(id) {
  return prisma.server.findUnique({ where: { id }, include });
}

async function create(data) {
  return prisma.server.create({ data, include });
}

async function update(id, data) {
  return prisma.server.update({ where: { id }, data, include });
}

async function remove(id) {
  return prisma.$transaction([
    prisma.serverLog.deleteMany({ where: { serverId: id } }),
    prisma.serverMetric.deleteMany({ where: { serverId: id } }),
    prisma.provisioningJob.deleteMany({ where: { serverId: id } }),
    prisma.serverManagedAccount.deleteMany({ where: { serverId: id } }),
    prisma.server.delete({ where: { id } }),
  ]);
}

async function findDefault(groupId) {
  return prisma.server.findFirst({
    where: { groupId, isDefault: true },
  });
}

async function clearGroupDefaults(groupId) {
  return prisma.server.updateMany({
    where: { groupId },
    data: { isDefault: false },
  });
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  findDefault,
  clearGroupDefaults,
};
