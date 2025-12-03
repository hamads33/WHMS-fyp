const  prisma  = require('../../../db/prisma');
const PurchaseStore = {
  async create(data) {
    return prisma.marketplacePurchase.create({ data });
  },

  async findByLicense(licenseKey) {
    return prisma.marketplacePurchase.findUnique({ where: { licenseKey }});
  },

  async listByUser(userId) {
    return prisma.marketplacePurchase.findMany({ where: { userId }});
  }
};

module.exports = PurchaseStore;
