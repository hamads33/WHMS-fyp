const prisma = require('../../../db/prisma');

const SubmissionStore = {
  async create(data) {
    return prisma.marketplaceSubmission.create({ data });
  },

  async listPending() {
    return prisma.marketplaceSubmission.findMany({
      where: { status: 'pending' }
    });
  },

  async update(id, data) {
    return prisma.marketplaceSubmission.update({
      where: { id },
      data
    });
  },

  async findById(id) {
    return prisma.marketplaceSubmission.findUnique({
      where: { id }
    });
  },

  // ✅ FIX #1 — required by admin.controller
  async listAll() {
    return prisma.marketplaceSubmission.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        version: true,
        reviewer: true
      }
    });
  },

  // ✅ Fix seller dashboard submissions
  async listBySeller(sellerId) {
    return prisma.marketplaceSubmission.findMany({
      where: { sellerId },
      include: {
        product: true,
        version: true
      },
      orderBy: { createdAt: 'desc' },
    });
  }
};

module.exports = SubmissionStore;
