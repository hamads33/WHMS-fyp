const prisma = require("../../../db/prisma");

const BuildLogStore = {
  async create({ submissionId = null, productId = null, versionId = null, level = "info", step = null, message, meta = null }) {
    return prisma.marketplaceBuildLog.create({
      data: { submissionId, productId, versionId, level, step, message, meta }
    });
  },

  async listBySubmission(submissionId, { skip = 0, take = 100 } = {}) {
    return prisma.marketplaceBuildLog.findMany({
      where: { submissionId },
      orderBy: { createdAt: "asc" },
      skip,
      take
    });
  },

  async listByProduct(productId, { skip = 0, take = 100 } = {}) {
    return prisma.marketplaceBuildLog.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      skip,
      take
    });
  },

  async tail(submissionId, { afterTimestamp = null, limit = 100 } = {}) {
    const where = { submissionId };
    if (afterTimestamp) {
      where.createdAt = { gt: new Date(afterTimestamp) };
    }
    return prisma.marketplaceBuildLog.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit
    });
  },

  async findById(id) {
    return prisma.marketplaceBuildLog.findUnique({ where: { id } });
  }
};

module.exports = BuildLogStore;
