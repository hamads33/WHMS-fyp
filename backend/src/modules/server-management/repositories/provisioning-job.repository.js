const prisma = require("../../../../prisma");

const include = {
  server: { select: { id: true, name: true, hostname: true, type: true } },
};

async function create(data) {
  return prisma.provisioningJob.create({ data, include });
}

async function findById(id) {
  return prisma.provisioningJob.findUnique({ where: { id }, include });
}

async function findAll({ serverId, status, type } = {}) {
  return prisma.provisioningJob.findMany({
    where: {
      ...(serverId && { serverId }),
      ...(status && { status }),
      ...(type && { type }),
    },
    include,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

async function findPending() {
  return prisma.provisioningJob.findMany({
    where: { status: "pending" },
    include,
    orderBy: { createdAt: "asc" },
  });
}

async function findFailed() {
  return prisma.provisioningJob.findMany({
    where: { status: "failed", attempts: { lt: 3 } },
    include,
    orderBy: { createdAt: "asc" },
  });
}

async function findStuck() {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
  return prisma.provisioningJob.findMany({
    where: { status: "running", updatedAt: { lt: cutoff } },
    include,
    orderBy: { createdAt: "asc" },
  });
}

async function update(id, data) {
  return prisma.provisioningJob.update({ where: { id }, data });
}

module.exports = { create, findById, findAll, findPending, findFailed, findStuck, update };
