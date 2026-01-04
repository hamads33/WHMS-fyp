const prisma = require("../../../../prisma");

class ServiceService {
  /**
   * Create a new hosting service
   * - Validates unique service code
   */
  async create(data, actor) {
    try {
      const service = await prisma.service.create({
        data: {
          code: data.code,
          name: data.name,
          description: data.description,
          active: true,
        },
        include: { plans: true },
      });

      return service;
    } catch (err) {
      if (err.code === "P2002") {
        const e = new Error("Service code already exists");
        e.statusCode = 409;
        throw e;
      }
      throw err;
    }
  }

  /**
   * Get all services including inactive (admin view)
   */
  async listAll() {
    return prisma.service.findMany({
      include: {
        plans: {
          include: { pricing: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get active services only (client view)
   */
  async listActive() {
    return prisma.service.findMany({
      where: { active: true },
      include: {
        plans: {
          where: { active: true },
          include: {
            pricing: { where: { active: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get service by ID (admin - includes all plans/pricing)
   */
  async getById(id) {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        plans: {
          include: { pricing: true },
        },
      },
    });

    if (!service) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    return service;
  }

  /**
   * Get service by ID (client - includes only active plans/pricing)
   * FIX: Properly check both ID AND active status
   */
  async getActiveById(id) {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        plans: {
          where: { active: true },
          include: {
            pricing: { where: { active: true } },
          },
        },
      },
    });

    // Check if service exists AND is active
    if (!service || !service.active) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    return service;
  }

  /**
   * Update service details
   * - Validates service exists
   */
  async update(id, data, actor) {
    const existingService = await this.getById(id);

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.active !== undefined) updateData.active = data.active;

    const updatedService = await prisma.service.update({
      where: { id },
      data: updateData,
      include: { plans: true },
    });

    return updatedService;
  }

  /**
   * Soft deactivate service
   * - Sets active to false
   */
  async deactivate(id, actor) {
    const service = await this.getById(id);

    const updated = await prisma.service.update({
      where: { id },
      data: { active: false },
    });

    return updated;
  }
}

module.exports = new ServiceService();