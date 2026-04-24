const prisma = require("../../../../prisma");

class ServiceCrossSellService {
  async add(serviceId, crossSellServiceId) {
    try {
      return await prisma.serviceCrossSell.create({
        data: { serviceId, crossSellServiceId },
        include: {
          crossSellService: { select: { id: true, name: true, code: true, shortDescription: true } },
        },
      });
    } catch (err) {
      if (err.code === "P2002") {
        const e = new Error("This service is already a cross-sell");
        e.statusCode = 409;
        throw e;
      }
      throw err;
    }
  }

  async listByService(serviceId) {
    return prisma.serviceCrossSell.findMany({
      where: { serviceId },
      orderBy: { displayOrder: "asc" },
      include: {
        crossSellService: {
          select: { id: true, name: true, code: true, shortDescription: true, active: true },
        },
      },
    });
  }

  async remove(serviceId, crossSellServiceId) {
    await prisma.serviceCrossSell.deleteMany({
      where: { serviceId, crossSellServiceId },
    });
  }

  async reorder(serviceId, items) {
    await Promise.all(
      items.map(({ crossSellServiceId, displayOrder }) =>
        prisma.serviceCrossSell.updateMany({
          where: { serviceId, crossSellServiceId },
          data: { displayOrder },
        })
      )
    );
  }
}

module.exports = new ServiceCrossSellService();
