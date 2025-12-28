const prisma = require("../../../../prisma");

class ServiceService {
  async create(data, actor) {
    try {
      return await prisma.service.create({ data });
    } catch (err) {
      // Prisma unique constraint violation
      if (err.code === "P2002") {
        const e = new Error("Service code already exists");
        e.statusCode = 409; // HTTP Conflict
        throw e;
      }
      throw err;
    }
  }

  async listAll() {
    return prisma.service.findMany({
      include: { plans: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async listActive() {
    return prisma.service.findMany({
      where: { active: true },
      include: {
        plans: { where: { active: true } },
      },
    });
  }

  async getById(id) {
    const service = await prisma.service.findUnique({
      where: { id },
      include: { plans: true },
    });

    if (!service) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    return service;
  }

  async update(id, data, actor) {
    return prisma.service.update({
      where: { id },
      data,
    });
  }

  async deactivate(id, actor) {
    return prisma.service.update({
      where: { id },
      data: { active: false },
    });
  }
}

module.exports = new ServiceService();
