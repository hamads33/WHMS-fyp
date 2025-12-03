// modules/marketplace/services/sellerDashboard.service.js
const  prisma  = require("../../../db/prisma");

module.exports = {
  async getOverview(sellerId) {
    const purchases = await prisma.marketplacePurchase.findMany({
      where: { product: { sellerId } },
      include: { version: true }
    });
    const totalEarningsCents = purchases.reduce((s,p) => s + (p.version?.priceCents || 0), 0);
    const productCount = await prisma.marketplaceProduct.count({ where: { sellerId } });
    const pendingPayouts = await prisma.marketplacePayout.count({ where: { vendorId: sellerId, status: "pending" }});
    const agg = await prisma.marketplaceProduct.aggregate({
      where: { sellerId },
      _sum: { installCount: true },
      _avg: { ratingAvg: true }
    });
    return {
      totalEarningsCents,
      productCount,
      pendingPayouts,
      totalInstalls: agg._sum.installCount || 0,
      avgRating: agg._avg.ratingAvg || 0
    };
  },

  async getProductStats(sellerId, opts = { page: 1, take: 20 }) {
    const skip = (opts.page - 1) * opts.take;
    const products = await prisma.marketplaceProduct.findMany({
      where: { sellerId },
      include: {
        versions: { orderBy: { createdAt: "desc" }, take: 1 },
        purchases: true,
        reviews: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: opts.take
    });
    return products.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      installCount: p.installCount,
      downloadCount: p.downloadCount,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      latestVersion: p.versions?.[0]?.version || null,
      purchases: p.purchases?.length || 0,
      createdAt: p.createdAt
    }));
  },

  async getSubmissions(sellerId, opts = {}) {
    const products = await prisma.marketplaceProduct.findMany({ where: { sellerId }, select: { id: true }});
    const productIds = products.map(p => p.id);
    const where = { productId: { in: productIds } };
    if (opts.status) where.status = opts.status;
    return prisma.marketplaceSubmission.findMany({
      where,
      include: { product: true, version: true, reviewer: true },
      orderBy: { createdAt: "desc" }
    });
  },

  async requestPayout(sellerId, amount, methodDetails = {}) {
    if (!amount || amount <= 0) throw new Error("Invalid amount");
    return prisma.marketplacePayout.create({
      data: {
        id: `payout-${Date.now()}`,
        vendorId: sellerId,
        amount,
        methodDetails,
        status: "pending"
      }
    });
  },

  async listPayouts(sellerId, opts = { page: 1, take: 20 }) {
    const skip = (opts.page - 1) * opts.take;
    return prisma.marketplacePayout.findMany({
      where: { vendorId: sellerId },
      orderBy: { createdAt: "desc" },
      skip,
      take: opts.take
    });
  }
};
