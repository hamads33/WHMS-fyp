const prisma = require("../../../../prisma");

class ServicePolicyService {
  async setPolicy(planId, key, value) {
    return prisma.servicePolicy.upsert({
      where: { planId_key: { planId, key } },
      update: { value },
      create: { planId, key, value },
    });
  }

  async getPolicies(planId) {
    return prisma.servicePolicy.findMany({ where: { planId } });
  }
}

module.exports = new ServicePolicyService();
