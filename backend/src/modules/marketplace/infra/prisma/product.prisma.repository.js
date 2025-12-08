// src/modules/marketplace/infra/prisma/product.prisma.repository.js
const { v4: uuidv4 } = require("uuid");

class PrismaProductRepository {
  constructor(prisma) {
    this.prisma = prisma;
    this.model = prisma.marketplaceProduct;
  }

  async generateId() {
    return uuidv4();
  }

  async findById(id) {
    if (!id) return null;
    return this.model.findUnique({ where: { id } });
  }

  async findBySlug(slug) {
    if (!slug) return null;
    return this.model.findUnique({ where: { slug } });
  }

  /**
   * findMany accepts a filter object: { search, categoryId, sort, skip, take }
   */
  async findMany({ search, categoryId, sort, skip = 0, take = 20 } = {}) {
    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { shortDesc: { contains: search, mode: "insensitive" } },
        { longDesc: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy = [];
    if (sort === "rating") orderBy.push({ ratingAvg: "desc" });
    else if (sort === "latest") orderBy.push({ updatedAt: "desc" });
    else orderBy.push({ createdAt: "desc" });

    const [items, total] = await Promise.all([
      this.model.findMany({ where, skip, take, orderBy }),
      this.model.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Save: intelligently create or update:
   * - If product.id is missing => create (requires sellerId)
   * - If product.id exists:
   *    - if record exists => update
   *    - if record does NOT exist => create using provided id (usecase may pre-generate id)
   */
  async save(product) {
    if (!product) throw new Error("Product required");

    const payload = {
      title: product.title,
      slug: product.slug,
      shortDesc: product.shortDesc,
      longDesc: product.longDesc,
      categoryId: product.categoryId,
      tags: product.tags || [],
      status: product.status,
      rejectReason: product.rejectReason,
      logo: product.logo,
      screenshots: product.screenshots || [],
      documentation: product.documentation,
      ratingAvg: product.ratingAvg ?? 0,
      ratingCount: product.ratingCount ?? 0,
      installCount: product.installCount ?? 0,
      downloadCount: product.downloadCount ?? 0,
      updatedAt: product.updatedAt || new Date(),
      approvedAt: product.approvedAt || null,
    };

    // CASE 1: No id -> create (require sellerId)
    if (!product.id) {
      if (!product.sellerId) throw new Error("sellerId required for product creation");
      const newId = uuidv4();
      return this.model.create({
        data: {
          id: newId,
          sellerId: product.sellerId,
          ...payload,
        },
      });
    }

    // CASE 2: id provided -> check if exists
    const existing = await this.model.findUnique({ where: { id: product.id } });

    if (!existing) {
      // If no existing record but id supplied, create with the provided id.
      // This handles the pattern where usecase pre-generates an id.
      if (!product.sellerId) {
        // If sellerId missing we cannot create; this likely indicates misuse.
        throw new Error("sellerId required to create new product with provided id");
      }
      return this.model.create({
        data: {
          id: product.id,
          sellerId: product.sellerId,
          ...payload,
        },
      });
    }

    // CASE 3: exists -> update
    return this.model.update({
      where: { id: product.id },
      data: payload,
    });
  }

  async delete(id) {
    return this.model.delete({ where: { id } });
  }
}

module.exports = PrismaProductRepository;
