// src/modules/marketplace/infra/prisma/submission.prisma.repository.js
const { v4: uuidv4 } = require("uuid");

/**
 * PrismaSubmissionRepository
 *
 * - Uses connect/disconnect for relational updates (Prisma client friendly)
 * - Avoids setting `updatedAt` if your Prisma model doesn't have it
 * - Returns normalized objects with scalar ids (productId/versionId/reviewerId)
 */
class PrismaSubmissionRepository {
  constructor(prisma) {
    this.prisma = prisma;
    this.model = prisma.marketplaceSubmission;
  }

  async generateId() {
    return uuidv4();
  }

  async _normalizeSubmissionRecord(rec) {
    if (!rec) return null;

    return {
      id: rec.id,
      status: rec.status,
      notes: rec.notes,
      createdAt: rec.createdAt,
      // Prisma returned relations (may be null)
      product: rec.product || null,
      version: rec.version || null,
      reviewer: rec.reviewer || null,
      // scalar ids for easier compatibility
      productId: rec.product ? rec.product.id : rec.productId ?? null,
      versionId: rec.version ? rec.version.id : rec.versionId ?? null,
      reviewerId: rec.reviewer ? rec.reviewer.id : rec.reviewerId ?? null,
    };
  }

  async create(data) {
    const id = data.id || uuidv4();

    const createData = {
      id,
      status: data.status || "pending",
      notes: data.notes ?? null,
      createdAt: data.createdAt || new Date(),
    };

    if (data.productId) createData.product = { connect: { id: data.productId } };
    if (data.versionId) createData.version = { connect: { id: data.versionId } };
    if (data.reviewerId) createData.reviewer = { connect: { id: data.reviewerId } };

    const rec = await this.model.create({
      data: createData,
      include: { product: true, version: true, reviewer: true },
    });

    return this._normalizeSubmissionRecord(rec);
  }

  async findById(id) {
    if (!id) return null;
    const rec = await this.model.findUnique({
      where: { id },
      include: { product: true, version: true, reviewer: true },
    });
    return this._normalizeSubmissionRecord(rec);
  }

  async save(submission) {
    if (!submission) throw new Error("Submission entity required");

    // CREATE if no id
    if (!submission.id) {
      return this.create(submission);
    }

    // find existing
    const existing = await this.model.findUnique({
      where: { id: submission.id },
      include: { product: true, version: true, reviewer: true },
    });

    if (!existing) {
      // create with provided id
      const createPayload = {
        id: submission.id,
        status: submission.status || "pending",
        notes: submission.notes ?? null,
        createdAt: submission.createdAt || new Date(),
      };
      if (submission.productId) createPayload.product = { connect: { id: submission.productId } };
      if (submission.versionId) createPayload.version = { connect: { id: submission.versionId } };
      if (submission.reviewerId) createPayload.reviewer = { connect: { id: submission.reviewerId } };

      const rec = await this.model.create({
        data: createPayload,
        include: { product: true, version: true, reviewer: true },
      });
      return this._normalizeSubmissionRecord(rec);
    }

    // Build update payload — DO NOT include updatedAt (schema doesn't have it).
    const updateData = {
      status: submission.status ?? existing.status,
      notes: submission.notes ?? existing.notes,
    };

    // Relations: explicit presence in `submission` controls connect/disconnect
    if ("productId" in submission) {
      if (submission.productId) updateData.product = { connect: { id: submission.productId } };
      else updateData.product = { disconnect: true };
    }
    if ("versionId" in submission) {
      if (submission.versionId) updateData.version = { connect: { id: submission.versionId } };
      else updateData.version = { disconnect: true };
    }
    if ("reviewerId" in submission) {
      if (submission.reviewerId) updateData.reviewer = { connect: { id: submission.reviewerId } };
      else updateData.reviewer = { disconnect: true };
    }

    const rec = await this.model.update({
      where: { id: submission.id },
      data: updateData,
      include: { product: true, version: true, reviewer: true },
    });

    return this._normalizeSubmissionRecord(rec);
  }

  async findLatestByVersion(versionId) {
    if (!versionId) return null;
    const rec = await this.model.findFirst({
      where: { versionId },
      orderBy: { createdAt: "desc" },
      include: { product: true, version: true, reviewer: true },
    });
    return this._normalizeSubmissionRecord(rec);
  }
}

module.exports = PrismaSubmissionRepository;
