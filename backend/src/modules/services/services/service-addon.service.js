/**
 * Service Add-on Service
 * Path: src/modules/services/services/service-addon.service.js
 * 
 * Manages add-ons/extras that can be added to services
 * Examples: SSL upgrades, extra IPs, backup services, etc.
 */

const prisma = require("../../../../prisma");

class ServiceAddonService {
  /**
   * Create a new add-on
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

      const addon = await prisma.serviceAddon.create({
        data: {
          serviceId,
          name: data.name,
          description: data.description,
          code: data.code,
          setupFee: data.setupFee || 0,
          monthlyPrice: data.monthlyPrice,
          currency: data.currency || "USD",
          maxQuantity: data.maxQuantity,
          required: data.required || false,
          recurring: data.recurring !== false,
          billingType: data.billingType || "shared",
          active: true,
          position: data.position || 0,
        },
      });

      return addon;
    } catch (err) {
      if (err.statusCode) throw err;

      if (err.code === "P2002") {
        const e = new Error(
          `Add-on code "${data.code}" already exists for this service`
        );
        e.statusCode = 409;
        throw e;
      }
      throw err;
    }
  }

  /**
   * Get add-on by ID
   */
  async getById(id) {
    const addon = await prisma.serviceAddon.findUnique({
      where: { id },
      include: {
        pricing: true,
        planAddons: true,
      },
    });

    if (!addon) {
      const err = new Error("Add-on not found");
      err.statusCode = 404;
      throw err;
    }

    return addon;
  }

  /**
   * Get add-ons by service ID (admin - includes inactive)
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

    return prisma.serviceAddon.findMany({
      where: { serviceId },
      include: { pricing: true },
      orderBy: { position: "asc" },
    });
  }

  /**
   * Get active add-ons for a service (client view)
   */
  async getActiveByServiceId(serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    return prisma.serviceAddon.findMany({
      where: {
        serviceId,
        active: true,
      },
      include: {
        pricing: { where: { active: true } },
      },
      orderBy: { position: "asc" },
    });
  }

  /**
   * Get add-ons for a specific plan
   */
  async getByPlanId(planId) {
    const plan = await prisma.servicePlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      const err = new Error("Plan not found");
      err.statusCode = 404;
      throw err;
    }

    return prisma.serviceAddon.findMany({
      where: {
        planAddons: {
          some: { planId },
        },
      },
      include: { pricing: true, planAddons: true },
      orderBy: { position: "asc" },
    });
  }

  /**
   * Update add-on
   */
  async update(id, data, actor) {
    const addon = await this.getById(id);

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.setupFee !== undefined) updateData.setupFee = data.setupFee;
    if (data.monthlyPrice !== undefined) updateData.monthlyPrice = data.monthlyPrice;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.maxQuantity !== undefined) updateData.maxQuantity = data.maxQuantity;
    if (data.required !== undefined) updateData.required = data.required;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.position !== undefined) updateData.position = data.position;

    if (Object.keys(updateData).length === 0) {
      const err = new Error("No fields to update");
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.serviceAddon.update({
      where: { id },
      data: updateData,
      include: { pricing: true },
    });

    return updated;
  }

  /**
   * Delete add-on (soft delete)
   */
  async delete(id, actor) {
    const addon = await this.getById(id);

    const updated = await prisma.serviceAddon.update({
      where: { id },
      data: { active: false },
    });

    return updated;
  }

  /**
   * Add pricing for add-on
   */
  async createPricing(addonId, cycle, data, actor) {
    try {
      const addon = await this.getById(addonId);

      const pricing = await prisma.serviceAddonPricing.create({
        data: {
          addonId,
          cycle,
          price: data.price,
          setupFee: data.setupFee || 0,
          renewalPrice: data.renewalPrice,
          currency: data.currency || "USD",
        },
      });

      return pricing;
    } catch (err) {
      if (err.statusCode) throw err;

      if (err.code === "P2002") {
        const e = new Error(
          `Pricing for ${cycle} cycle already exists for this add-on`
        );
        e.statusCode = 409;
        throw e;
      }
      throw err;
    }
  }

  /**
   * Attach add-on to plan
   */
  async attachToPlan(addonId, planId, options = {}, actor) {
    try {
      const addon = await this.getById(addonId);
      const plan = await prisma.servicePlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        const err = new Error("Plan not found");
        err.statusCode = 404;
        throw err;
      }

      const planAddon = await prisma.servicePlanAddon.create({
        data: {
          planId,
          addonId,
          included: options.included || false,
          quantity: options.quantity || 1,
        },
      });

      return planAddon;
    } catch (err) {
      if (err.statusCode) throw err;

      if (err.code === "P2002") {
        const e = new Error("Add-on already attached to this plan");
        e.statusCode = 409;
        throw e;
      }
      throw err;
    }
  }

  /**
   * Detach add-on from plan
   */
  async detachFromPlan(addonId, planId, actor) {
    const planAddon = await prisma.servicePlanAddon.findFirst({
      where: {
        addonId,
        planId,
      },
    });

    if (!planAddon) {
      const err = new Error("Add-on not attached to this plan");
      err.statusCode = 404;
      throw err;
    }

    await prisma.servicePlanAddon.delete({
      where: { id: planAddon.id },
    });

    return { message: "Add-on detached from plan successfully" };
  }

  /**
   * Reorder add-ons
   */
  async reorder(addonIds, actor) {
    const updates = addonIds.map((id, index) =>
      prisma.serviceAddon.update({
        where: { id },
        data: { position: index },
      })
    );

    return Promise.all(updates);
  }

  /**
   * Get add-on with all pricing variations
   */
  async getDetailedById(id) {
    const addon = await this.getById(id);

    // Build pricing matrix
    const pricingMatrix = {};
    addon.pricing.forEach((p) => {
      pricingMatrix[p.cycle] = {
        price: p.price,
        setupFee: p.setupFee,
        renewalPrice: p.renewalPrice,
      };
    });

    return {
      ...addon,
      pricingMatrix,
    };
  }

  /**
   * Calculate total add-on cost for a plan
   */
  async calculateAddOnCost(planId, cycle) {
    const addons = await this.getByPlanId(planId);

    const included = addons.filter((a) =>
      a.planAddons.some((pa) => pa.planId === planId && pa.included)
    );

    let totalCost = 0;

    for (const addon of included) {
      const price = addon.pricing.find((p) => p.cycle === cycle);
      if (price) {
        totalCost += parseFloat(price.price);
      }
    }

    return totalCost;
  }
}

module.exports = new ServiceAddonService();