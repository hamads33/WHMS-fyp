// modules/marketplace/stores/sellerStore.js
const prisma  = require("../../../db/prisma");
console.log("💾 Loaded prisma in SellerStore:", typeof prisma); //remove afterwards
const SellerStore = {
  async findByUserId(userId) {
    return prisma.marketplaceSeller.findUnique({
      where: { userId },
      include: { user: true, products: true }
    });
  },

  async findById(id) {
    return prisma.marketplaceSeller.findUnique({
      where: { id },
      include: { user: true, products: true }
    });
  },

  async create(data) {
    return prisma.marketplaceSeller.create({ data });
  },

  async update(id, data) {
    return prisma.marketplaceSeller.update({ where: { id }, data });
  },

  async listProducts(sellerId, opts = { page: 1, take: 20 }) {
    const skip = (opts.page - 1) * opts.take;
    return prisma.marketplaceProduct.findMany({
      where: { sellerId },
      skip,
      take: opts.take,
      orderBy: { createdAt: "desc" }
    });
  }
};

module.exports = SellerStore;
