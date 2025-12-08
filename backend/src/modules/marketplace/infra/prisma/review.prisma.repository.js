// review.prisma.repository.js
const { v4: uuidv4 } = require("uuid");

class PrismaReviewRepository {
  constructor(prisma) {
    this.prisma = prisma;
    this.model = prisma.marketplaceReview;
  }

  async generateId() {
    return uuidv4();
  }

  async save(review) {
    if (!review) throw new Error("Review entity required");

    const baseData = {
      rating: review.rating,
      stability: review.stability ?? null,
      review: review.review ?? null,
      createdAt: review.createdAt || new Date(),
    };

    const relations = {
      product: review.productId
        ? { connect: { id: review.productId } }
        : undefined,

      user: review.userId
        ? { connect: { id: review.userId } }
        : undefined,
    };

    // CREATE
   if (!existing) {
  return this.model.create({
    data: {
      id: review.id,
      rating: review.rating,
      stability: review.stability ?? null,
      review: review.review ?? null,
      createdAt: review.createdAt || new Date(),

      product: {
        connect: { id: review.productId }
      },

      user: {
        connect: { id: review.userId } // ← REQUIRED
      }
    }
  });
}


    // CHECK EXISTENCE
    const existing = await this.model.findUnique({
      where: { id: review.id },
    });

    if (!existing) {
      return this.model.create({
        data: {
          id: review.id,
          ...baseData,
          ...relations,
        },
      });
    }

    // UPDATE
    return this.model.update({
      where: { id: review.id },
      data: {
        rating: review.rating ?? existing.rating,
        stability: review.stability ?? existing.stability,
        review: review.review ?? existing.review,

        ...(review.productId
          ? { product: { connect: { id: review.productId } } }
          : {}),

        ...(review.userId
          ? { user: { connect: { id: review.userId } } }
          : {}),
      },
    });
  }

  async listForProduct(productId, { skip = 0, take = 20 } = {}) {
    const items = await this.model.findMany({
      where: { productId },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
    const total = await this.model.count({ where: { productId } });
    return { items, total };
  }

  async statsForProduct(productId) {
    const result = await this.prisma.$queryRawUnsafe(`
      SELECT AVG("rating") as "avg", COUNT(*) as "count"
      FROM "MarketplaceReview"
      WHERE "productId" = '${productId}'
    `);
    return result[0] || { avg: null, count: 0 };
  }
}

module.exports = PrismaReviewRepository;
