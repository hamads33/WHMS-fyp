// src/modules/marketplace/infra/prisma/category.prisma.repository.js
class PrismaCategoryRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.marketplaceCategory.create({ data });
  }

  async findById(id) {
    return this.prisma.marketplaceCategory.findUnique({ where: { id } });
  }

  async findBySlug(slug) {
    return this.prisma.marketplaceCategory.findUnique({ where: { slug } });
  }

  async list() {
    return this.prisma.marketplaceCategory.findMany({ orderBy: { name: "asc" } });
  }
}

module.exports = PrismaCategoryRepository;
