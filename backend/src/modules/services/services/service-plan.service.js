const prisma = require("../../../../prisma");

class ServicePlanService {
  async create(serviceId, data, actor) {
    return prisma.servicePlan.create({
      data: {
        ...data,
        serviceId,
      },
    });
  }

  async update(id, data, actor) {
    return prisma.servicePlan.update({
      where: { id },
      data,
    });
  }
}

module.exports = new ServicePlanService();
