const  prisma  = require('../../../db/prisma');

const ActivationStore = {
  async create(data) {
    return prisma.marketplaceLicenseActivation.create({ data });
  },

  async listByLicense(licenseId) {
    return prisma.marketplaceLicenseActivation.findMany({ where: { licenseId }});
  }
};

module.exports = ActivationStore;
