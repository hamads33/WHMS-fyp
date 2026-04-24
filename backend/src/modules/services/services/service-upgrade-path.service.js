const prisma = require("../../../../prisma");

class ServiceUpgradePathService {
  async create(serviceId, data) {
    try {
      return await prisma.serviceUpgradePath.create({
        data: {
          serviceId,
          fromPlanId: data.fromPlanId,
          toPlanId: data.toPlanId,
          allowed: data.allowed ?? true,
          prorated: data.prorated ?? true,
          creditUnused: data.creditUnused ?? true,
        },
        include: {
          fromPlan: { select: { id: true, name: true } },
          toPlan: { select: { id: true, name: true } },
        },
      });
    } catch (err) {
      if (err.code === "P2002") {
        const e = new Error("Upgrade path between these plans already exists");
        e.statusCode = 409;
        throw e;
      }
      throw err;
    }
  }

  async listByService(serviceId) {
    return prisma.serviceUpgradePath.findMany({
      where: { serviceId },
      include: {
        fromPlan: { select: { id: true, name: true, active: true } },
        toPlan: { select: { id: true, name: true, active: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async update(id, data) {
    const updateData = {};
    if (data.allowed !== undefined) updateData.allowed = data.allowed;
    if (data.prorated !== undefined) updateData.prorated = data.prorated;
    if (data.creditUnused !== undefined) updateData.creditUnused = data.creditUnused;
    return prisma.serviceUpgradePath.update({ where: { id }, data: updateData });
  }

  async delete(id) {
    await prisma.serviceUpgradePath.delete({ where: { id } });
  }
}

module.exports = new ServiceUpgradePathService();
