const  prisma  = require('../../../db/prisma');

const EndpointStore = {
  async create(data) {
    return prisma.marketplaceWebhookEndpoint.create({ data });
  },

  async listByVendor(vendorId) {
    return prisma.marketplaceWebhookEndpoint.findMany({ where: { vendorId }});
  },

  async listAllActive() {
    return prisma.marketplaceWebhookEndpoint.findMany({ where: { enabled: true }});
  },

  async findById(id) {
    return prisma.marketplaceWebhookEndpoint.findUnique({ where: { id }});
  },

  async update(id, data) {
    return prisma.marketplaceWebhookEndpoint.update({ where: { id }, data });
  }
};

module.exports = EndpointStore;
