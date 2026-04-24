const prisma = require("../../../../prisma");

async function create({ serverId, action, message }) {
  return prisma.serverLog.create({
    data: { serverId, action, message },
  });
}

async function findByServer(serverId, { limit = 50, action } = {}) {
  return prisma.serverLog.findMany({
    where: {
      serverId,
      ...(action && { action }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function findAll({ action, limit = 100 } = {}) {
  return prisma.serverLog.findMany({
    where: { ...(action && { action }) },
    include: { server: { select: { id: true, name: true, hostname: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

module.exports = { create, findByServer, findAll };
