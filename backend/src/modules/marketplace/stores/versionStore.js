const prisma = require('../../../db/prisma');

const VersionStore = {
  async listByProduct(productId) {
    return prisma.marketplaceVersion.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getLatest(productId) {
    return prisma.marketplaceVersion.findFirst({
      where: { productId },
      orderBy: { createdAt: 'desc' }
    });
  },

  async get(versionId) {
    return prisma.marketplaceVersion.findUnique({
      where: { id: versionId }
    });
  },

  async findById(id) {
  return prisma.marketplaceVersion.findUnique({ where: { id } });
},

async findLatest(productId) {
  return prisma.marketplaceVersion.findFirst({
    where: { productId },
    orderBy: { createdAt: 'desc' }
  });
},

async findLatestApproved(productId) {
  return prisma.marketplaceVersion.findFirst({
    where: { productId },
    orderBy: { createdAt: 'desc' }
  });
},


  async create({ productId, version, manifestJson, archivePath, changelog, priceCents }) {
    return prisma.marketplaceVersion.create({
      data: {
        productId,
        version,
        manifestJson,
        archivePath,
        changelog,
        priceCents
      }
    });
  }
};

module.exports = VersionStore;
