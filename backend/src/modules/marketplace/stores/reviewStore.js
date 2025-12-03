const prisma = require('../../../db/prisma');

const ReviewStore = {
  async listByProduct(productId) {
    return prisma.marketplaceReview.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' }
    });
  }
};

module.exports = ReviewStore;
