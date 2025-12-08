// purchase.prisma.repository.js
const { v4: uuidv4 } = require("uuid");

class PrismaPurchaseRepository {
  constructor(prisma) {
    this.prisma = prisma;
    this.model = prisma.marketplacePurchase;
  }

  async generateId() {
    return uuidv4();
  }

  async save(purchase) {
    if (!purchase.id) {
      const id = purchase.id || (await this.generateId());
      return this.model.create({ data: { id, ...purchase } });
    }
    return this.model.update({
      where: { id: purchase.id },
      data: {
        revoked: purchase.revoked,
        expiresAt: purchase.expiresAt,
        subscribed: purchase.subscribed,
        activationLimit: purchase.activationLimit,
      },
    });
  }

  async findByLicenseKey(licenseKey) {
    if (!licenseKey) return null;
    return this.model.findUnique({ where: { licenseKey } });
  }

  async findById(id) {
    if (!id) return null;
    return this.model.findUnique({ where: { id } });
  }
}

module.exports = PrismaPurchaseRepository;
