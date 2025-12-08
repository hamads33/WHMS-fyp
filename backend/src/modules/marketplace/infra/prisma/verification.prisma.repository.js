// verification.prisma.repository.js
const { v4: uuidv4 } = require("uuid");

class PrismaVerificationRepository {
  constructor(prisma) {
    this.prisma = prisma;
    this.model = prisma.marketplaceVerification;
  }

  async generateId() {
    return uuidv4();
  }

  /* ------------------------------------------------------
   * CREATE (required by UploadVersionUseCase)
   * ------------------------------------------------------ */
  async create(data) {
    const id = data.id ?? uuidv4();

    return this.model.create({
      data: {
        id,
        productId: data.productId,
        versionId: data.versionId,
        passed: data.passed ?? false,
        issues: data.issues || {},
        createdAt: new Date(),
      },
    });
  }

  /* ------------------------------------------------------
   * SAVE (update or create)
   * ------------------------------------------------------ */
  async save(verification) {
    if (!verification.id) {
      return this.create(verification);
    }

    const existing = await this.model.findUnique({
      where: { id: verification.id },
    });

    if (!existing) {
      return this.create(verification);
    }

    return this.model.update({
      where: { id: verification.id },
      data: {
        passed: verification.passed,
        issues: verification.issues || verification.report || {},
      },
    });
  }

  /* ------------------------------------------------------
   * FIND METHODS
   * ------------------------------------------------------ */
  async findById(id) {
    if (!id) return null;
    return this.model.findUnique({ where: { id } });
  }

  async findByVersion(versionId, { skip = 0, take = 50 } = {}) {
    const items = await this.model.findMany({
      where: { versionId },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });

    const total = await this.model.count({ where: { versionId } });

    return { items, total };
  }
}

module.exports = PrismaVerificationRepository;
