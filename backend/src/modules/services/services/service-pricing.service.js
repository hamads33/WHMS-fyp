const prisma = require("../../../../prisma");

class ServicePricingService {
  async create(planId, data, actor) {
    return prisma.servicePricing.create({
      data: {
        ...data,
        planId,
      },
    });
  }
}

module.exports = new ServicePricingService();
