const prisma = require("../../../../prisma");

class ServicePlanService {
  /**
   * Create service plan
   * - Validates service exists
   * - Prevents duplicate plan names within service
   */
  async create(serviceId, data, actor) {
    try {
      // Validate service exists
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        const err = new Error("Service not found");
        err.statusCode = 404;
        throw err;
      }

      const plan = await prisma.servicePlan.create({
        data: {
          serviceId,
          name: data.name,
          summary: data.description,
          active: true,
          position: data.position || 0,
        },
        include: { pricing: true },
      });

      return plan;
    } catch (err) {
      if (err.statusCode) throw err;
      
      // FIX: Handle unique constraint on [serviceId, name]
      if (err.code === "P2002") {
        const e = new Error(
          `Plan name "${data.name}" already exists for this service`
        );
        e.statusCode = 409;
        throw e;
      }
      throw err;
    }
  }

  /**
   * Update service plan
   * - Validates plan exists
   * - Checks for duplicate names if updating
   */
  async update(id, data, actor) {
    const plan = await this.getById(id);

    // Check for duplicate name if updating
    if (data.name && data.name !== plan.name) {
      const existingPlan = await prisma.servicePlan.findFirst({
        where: {
          serviceId: plan.serviceId,
          name: data.name,
          id: { not: id },
        },
      });

      if (existingPlan) {
        const err = new Error(
          `Plan name "${data.name}" already exists for this service`
        );
        err.statusCode = 409;
        throw err;
      }
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.summary = data.description;
    if (data.position !== undefined) updateData.position = data.position;

    const updated = await prisma.servicePlan.update({
      where: { id },
      data: updateData,
      include: { pricing: true },
    });

    return updated;
  }

  /**
   * Toggle plan active status
   */
  async toggleActive(id, actor) {
    const plan = await this.getById(id);

    const updated = await prisma.servicePlan.update({
      where: { id },
      data: { active: !plan.active },
      include: { pricing: true },
    });

    return updated;
  }

  /**
   * Activate plan
   */
  async activate(id, actor) {
    const plan = await this.getById(id);

    if (plan.active) {
      const err = new Error("Plan is already active");
      err.statusCode = 400;
      throw err;
    }

    return this.toggleActive(id, actor);
  }

  /**
   * Deactivate plan
   */
  async deactivate(id, actor) {
    const plan = await this.getById(id);

    if (!plan.active) {
      const err = new Error("Plan is already inactive");
      err.statusCode = 400;
      throw err;
    }

    return this.toggleActive(id, actor);
  }

  /**
   * Get plan by ID
   */
  async getById(id) {
    const plan = await prisma.servicePlan.findUnique({
      where: { id },
      include: { pricing: true },
    });

    if (!plan) {
      const err = new Error("Plan not found");
      err.statusCode = 404;
      throw err;
    }

    return plan;
  }

  /**
   * Get plans by service ID (admin - includes inactive)
   */
  async getByServiceId(serviceId) {
    // Validate service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    return prisma.servicePlan.findMany({
      where: { serviceId },
      include: { pricing: true },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Get active plans by service ID (client view)
   */
  async getActiveByServiceId(serviceId) {
    // Validate service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId, active: true },
    });

    if (!service) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    return prisma.servicePlan.findMany({
      where: { serviceId, active: true },
      include: {
        pricing: { where: { active: true } },
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    });
  }
}

module.exports = new ServicePlanService();