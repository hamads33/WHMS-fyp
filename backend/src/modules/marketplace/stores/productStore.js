// src/modules/marketplace/stores/productStore.js
const  prisma  = require("../../../db/prisma");

const ProductStore = {
  async createDraft(data) {
    return prisma.marketplaceProduct.create({ data });
  },

  async update(productId, data) {
    return prisma.marketplaceProduct.update({
      where: { id: productId },
      data,
    });
  },

  async findById(id) {
    return prisma.marketplaceProduct.findUnique({ where: { id } });
  },

  async findBySlug(slug) {
    return prisma.marketplaceProduct.findUnique({
      where: { slug },
      include: {
        seller: true,
        versions: true,
        dependencies: true,
        reviews: true,
      },
    });
  },

  async listPublic(query = {}) {
    const where = { status: "approved" };

    if (query.category) where.category = query.category;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { shortDesc: { contains: query.search, mode: "insensitive" } },
        { longDesc: { contains: query.search, mode: "insensitive" } },
        { tags: { has: query.search } },
      ];
    }

    const order =
      query.sort === "trending"
        ? [{ installCount: "desc" }]
        : query.sort === "new"
        ? [{ createdAt: "desc" }]
        : query.sort === "updated"
        ? [{ lastUpdatedAt: "desc" }]
        : [{ createdAt: "desc" }];

    return prisma.marketplaceProduct.findMany({
      where,
      orderBy: order,
      skip: Number(query.skip || 0),
      take: Number(query.take || 20),
      include: {
        seller: true,
        categoryRel: true,
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        reviews: true,
      },
    });
  },

  async searchPublic(term) {
    return prisma.marketplaceProduct.findMany({
      where: {
        status: "approved",
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { shortDesc: { contains: term, mode: "insensitive" } },
          { longDesc: { contains: term, mode: "insensitive" } },
          { tags: { has: term } },
        ],
      },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  },

  async listBySeller(sellerId) {
    return prisma.marketplaceProduct.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      include: {
        versions: true,
        submissions: true,
      },
    });
  },

  async listAdmin() {
    return prisma.marketplaceProduct.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        seller: true,
        versions: true,
      },
    });
  },

  async setStatus(id, status, reason = null) {
    return prisma.marketplaceProduct.update({
      where: { id },
      data: { status, rejectReason: reason },
    });
  },

  async publish(productId) {
    return prisma.marketplaceProduct.update({
      where: { id: productId },
      data: {
        status: "approved",
        approvedAt: new Date(),
      },
    });
  },

  async reject(productId, reason) {
    return prisma.marketplaceProduct.update({
      where: { id: productId },
      data: {
        status: "rejected",
        rejectReason: reason,
      },
    });
  },

  async touchUpdatedAt(productId) {
    return prisma.marketplaceProduct.update({
      where: { id: productId },
      data: { lastUpdatedAt: new Date() },
    });
  },

  async incrementInstall(id) {
    return prisma.marketplaceProduct.update({
      where: { id },
      data: { installCount: { increment: 1 } },
    });
  },

  async incrementDownload(id) {
    return prisma.marketplaceProduct.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
  },

  async updateRatings(productId) {
    const reviews = await prisma.marketplaceReview.findMany({
      where: { productId },
      select: { rating: true },
    });

    if (!reviews || !reviews.length) {
      return prisma.marketplaceProduct.update({
        where: { id: productId },
        data: { ratingAvg: 0, ratingCount: 0 },
      });
    }

    const count = reviews.length;
    const avg = reviews.reduce((a, b) => a + b.rating, 0) / count;

    return prisma.marketplaceProduct.update({
      where: { id: productId },
      data: { ratingAvg: avg, ratingCount: count },
    });
  },
};

module.exports = ProductStore;
