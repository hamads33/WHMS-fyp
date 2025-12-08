// src/modules/marketplace/infra/prisma/base.prisma.repository.js
class BasePrismaRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async raw(query) {
    return this.prisma.$queryRawUnsafe(query);
  }
}

module.exports = BasePrismaRepository;
