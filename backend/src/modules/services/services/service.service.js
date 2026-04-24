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
          shortDescription: data.shortDescription,
          groupId: data.groupId,
          moduleName: data.moduleName,
          moduleType: data.moduleType,
          paymentType: data.paymentType || "regular",
          requiresDomain: data.requiresDomain ?? false,
          allowAutoRenew: data.allowAutoRenew ?? true,
          billingCycles: data.billingCycles || "monthly,quarterly,semi_annually,annually",
          position: data.position || 0,
          active: true,
          // WHMCS-like fields
          color: data.color,
          tagline: data.tagline,
          featured: data.featured ?? false,
          retired: data.retired ?? false,
          welcomeEmailTemplate: data.welcomeEmailTemplate,
          onDemandRenewals: data.onDemandRenewals ?? true,
          prorataBilling: data.prorataBilling ?? false,
          prorataDate: data.prorataDate ?? 0,
          chargeNextMonth: data.chargeNextMonth ?? 0,
          recurringCyclesLimit: data.recurringCyclesLimit ?? 0,
          autoTerminateDays: data.autoTerminateDays ?? 0,
          multipleQuantities: data.multipleQuantities ?? "no",
          serverGroup: data.serverGroup,
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
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.groupId !== undefined) updateData.groupId = data.groupId;
    if (data.moduleName !== undefined) updateData.moduleName = data.moduleName;
    if (data.moduleType !== undefined) updateData.moduleType = data.moduleType;
    if (data.paymentType !== undefined) updateData.paymentType = data.paymentType;
    if (data.requiresDomain !== undefined) updateData.requiresDomain = data.requiresDomain;
    if (data.allowAutoRenew !== undefined) updateData.allowAutoRenew = data.allowAutoRenew;
    if (data.billingCycles !== undefined) updateData.billingCycles = data.billingCycles;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.active !== undefined) updateData.active = data.active;
    // WHMCS-like fields
    if (data.color !== undefined) updateData.color = data.color;
    if (data.tagline !== undefined) updateData.tagline = data.tagline;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.retired !== undefined) updateData.retired = data.retired;
    if (data.welcomeEmailTemplate !== undefined) updateData.welcomeEmailTemplate = data.welcomeEmailTemplate;
    if (data.onDemandRenewals !== undefined) updateData.onDemandRenewals = data.onDemandRenewals;
    if (data.prorataBilling !== undefined) updateData.prorataBilling = data.prorataBilling;
    if (data.prorataDate !== undefined) updateData.prorataDate = data.prorataDate;
    if (data.chargeNextMonth !== undefined) updateData.chargeNextMonth = data.chargeNextMonth;
    if (data.recurringCyclesLimit !== undefined) updateData.recurringCyclesLimit = data.recurringCyclesLimit;
    if (data.autoTerminateDays !== undefined) updateData.autoTerminateDays = data.autoTerminateDays;
    if (data.multipleQuantities !== undefined) updateData.multipleQuantities = data.multipleQuantities;
    if (data.serverGroup !== undefined) updateData.serverGroup = data.serverGroup;

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

  async toggleVisibility(id, actor) {
    const service = await this.getById(id);
    return prisma.service.update({
      where: { id },
      data: { hidden: !service.hidden },
    });
  }

  async getComparison(id) {
    const service = await this.getById(id);
    return service;
  }

  async getStats(id) {
    const service = await this.getById(id);
    const planIds = service.plans.map((p) => p.id);
    const orderCount = await prisma.order.count({
      where: { snapshot: { planId: { in: planIds } } },
    }).catch(() => 0);
    return { service, orderCount };
  }

  async bulkUpdate(ids, data, actor) {
    await prisma.service.updateMany({ where: { id: { in: ids } }, data });
    return { updated: ids.length };
  }

  async bulkDelete(ids, actor) {
    await prisma.service.updateMany({ where: { id: { in: ids } }, data: { active: false } });
    return { deleted: ids.length };
  }

  async hardDelete(id, actor) {
    await this.getById(id);
    await prisma.service.delete({ where: { id } });
  }

  async bulkHardDelete(ids, actor) {
    await prisma.service.deleteMany({ where: { id: { in: ids } } });
    return { deleted: ids.length };
  }

  async importServices(data, actor) {
    const results = [];
    for (const item of data) {
      try {
        const s = await this.create(item, actor);
        results.push({ success: true, code: item.code, id: s.id });
      } catch (err) {
        results.push({ success: false, code: item.code, error: err.message });
      }
    }
    return results;
  }

  async exportServices() {
    return this.listAll();
  }
}

module.exports = new ServiceService();