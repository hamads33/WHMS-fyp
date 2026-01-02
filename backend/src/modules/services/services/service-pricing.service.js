const prisma = require("../../../../prisma");

class ServicePricingService {
  async create(planId, data, actor) {
    try {
      return await prisma.servicePricing.create({
        data: {
          ...data,
          planId,
        },
      });
    } catch (err) {
      // FR-SRV-11: Handle duplicate pricing per billing cycle
      if (err.code === "P2002") {
        const e = new Error("Pricing already exists for this billing cycle");
        e.statusCode = 409;
        throw e;
      }
      throw err;
    }
  }
}

module.exports = new ServicePricingService();