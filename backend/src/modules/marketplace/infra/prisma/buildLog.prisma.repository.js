// src/modules/marketplace/infra/prisma/buildLog.prisma.repository.js
class PrismaBuildLogRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.marketplaceBuildLog.create({ data });
  }

  async findBySubmission(submissionId, { skip = 0, take = 100 } = {}) {
    return this.prisma.marketplaceBuildLog.findMany({
      where: { submissionId },
      skip,
      take,
      orderBy: { createdAt: "asc" },
    });
  }
}

module.exports = PrismaBuildLogRepository;
