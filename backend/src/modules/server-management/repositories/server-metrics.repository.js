const prisma = require("../../../../prisma");

const RANGE_MAP = {
  "1h":  60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d":  7 * 24 * 60 * 60 * 1000,
};

async function create(data) {
  return prisma.serverMetric.create({ data });
}

async function findByServer(serverId, range = "24h") {
  const ms = RANGE_MAP[range] ?? RANGE_MAP["24h"];
  const since = new Date(Date.now() - ms);

  return prisma.serverMetric.findMany({
    where: { serverId, recordedAt: { gte: since } },
    orderBy: { recordedAt: "asc" },
  });
}

async function findLatest(serverId) {
  return prisma.serverMetric.findFirst({
    where: { serverId },
    orderBy: { recordedAt: "desc" },
  });
}

async function deleteOlderThan(days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.serverMetric.deleteMany({
    where: { recordedAt: { lt: cutoff } },
  });
}

module.exports = { create, findByServer, findLatest, deleteOlderThan };
