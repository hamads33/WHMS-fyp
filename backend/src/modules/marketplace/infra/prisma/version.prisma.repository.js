// src/modules/marketplace/infra/prisma/version.prisma.repository.js
const { v4: uuidv4 } = require("uuid");

class PrismaVersionRepository {
  constructor(prisma) {
    this.prisma = prisma;
    this.model = prisma.marketplaceVersion;
  }

  async generateId() {
    return uuidv4();
  }

  /* -----------------------------
   * NEW: create() required by UploadVersionUseCase
   * ----------------------------- */
  async create(data) {
    const id = data.id || uuidv4();

    return this.model.create({
      data: {
        id,
        productId: data.productId,
        version: data.version,
        manifestJson: data.manifestJson || {},
        archivePath: data.archivePath || "",
        priceCents: data.priceCents ?? 0,
        currency: data.currency || "USD",
      },
    });
  }

  async findById(id) {
    if (!id) return null;
    return this.model.findUnique({ where: { id } });
  }

  async listForProduct(productId) {
    if (!productId) return [];
    return this.model.findMany({
      where: { productId },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  /**
   * SAVE LOGIC:
   * - If version.id missing → create (requires productId)
   * - If version.id exists:
   *      - IF record exists → update
   *      - IF NOT exists → create with provided ID
   */
  async save(version) {
    if (!version) throw new Error("Version entity is required");

    const payload = {
      productId: version.productId,
      version: version.version,
      changelog: version.changelog,
      manifestJson: version.manifestJson || {},
      archivePath: version.archivePath || "",
      priceCents: version.priceCents ?? 0,
      currency: version.currency || "USD",
      createdAt: version.createdAt || new Date(),
    };

    // CASE 1: No ID → CREATE
    if (!version.id) {
      if (!version.productId)
        throw new Error("productId required to create version");

      const newId = uuidv4();
      return this.model.create({
        data: {
          id: newId,
          ...payload,
        },
      });
    }

    // CASE 2: ID exists → check DB
    const existing = await this.model.findUnique({
      where: { id: version.id },
    });

    if (!existing) {
      // CREATE with provided ID
      return this.model.create({
        data: {
          id: version.id,
          ...payload,
        },
      });
    }

    // CASE 3: UPDATE
    return this.model.update({
      where: { id: version.id },
      data: payload,
    });
  }
}

module.exports = PrismaVersionRepository;
