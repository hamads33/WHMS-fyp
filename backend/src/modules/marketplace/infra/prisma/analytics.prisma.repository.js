// src/modules/marketplace/infra/prisma/analytics.prisma.repository.js
class PrismaAnalyticsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(event) {
    return this.prisma.marketplaceAnalytics.create({ data: event });
  }

  async findRecentForProduct(productId, { limit = 100 } = {}) {
    return this.prisma.marketplaceAnalytics.findMany({
      where: { productId },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async overview(productId) {
    // simple counts by event type
    const rows = await this.prisma.$queryRawUnsafe(`
      SELECT "eventType", COUNT(*) as count
      FROM "MarketplaceAnalytics"
      WHERE "productId" = '${productId}'
      GROUP BY "eventType"
    `);
    return rows;
  }
}

module.exports = PrismaAnalyticsRepository;
