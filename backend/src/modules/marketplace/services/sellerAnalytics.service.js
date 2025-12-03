// modules/marketplace/services/sellerAnalytics.service.js
const  prisma  = require("../../../db/prisma");

module.exports = {
  async getOverview(sellerId, opts = { top: 5 }) {
    // Return latest analytics events for seller's products
    const prods = await prisma.marketplaceProduct.findMany({ where: { sellerId }, select: { id: true }});
    const productIds = prods.map(p => p.id);
    return prisma.marketplaceAnalytics.findMany({
      where: { productId: { in: productIds } },
      orderBy: { createdAt: "desc" },
      take: opts.top
    });
  },

  async getProductStats(sellerId, productId, opts = { days: 30 }) {
    const p = await prisma.marketplaceProduct.findUnique({ where: { id: productId }});
    if (!p || p.sellerId !== sellerId) throw new Error("forbidden");
    const since = new Date();
    since.setDate(since.getDate() - opts.days);
    return prisma.marketplaceAnalytics.findMany({
      where: { productId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" }
    });
  },

  async getCrashes(sellerId, productId, opts = { skip: 0, take: 100 }) {
    const p = await prisma.marketplaceProduct.findUnique({ where: { id: productId }});
    if (!p || p.sellerId !== sellerId) throw new Error("forbidden");
    return prisma.marketplaceCrash.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      skip: opts.skip,
      take: opts.take
    });
  }
};
