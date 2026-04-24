/**
 * Service Pricing Service
 * Path: src/modules/services/services/service-pricing.service.js
 */

const prisma = require("../../../../prisma");

class ServicePricingService {
  /**
   * Create pricing for a plan
   */
  async create(planId, data, actor) {
    try {
      // Validate plan exists
      const plan = await prisma.servicePlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        const err = new Error("Plan not found");
        err.statusCode = 404;
        throw err;
      }

      const pricing = await prisma.servicePricing.create({
        data: {
          planId,
          cycle:          data.cycle,
          price:          data.price,
          setupFee:       data.setupFee       ?? 0,
          renewalPrice:   data.renewalPrice   ?? null,
          suspensionFee:  data.suspensionFee  ?? 0,
          terminationFee: data.terminationFee ?? 0,
          currency:       data.currency       || "USD",
          discountType:   data.discountType   || null,
          discountAmount: data.discountAmount ?? 0,
          discountValidUntil: data.discountValidUntil || null,
          taxable:        data.taxable        ?? true,
          active:         true,
        },
      });

      return pricing;
    } catch (err) {
      if (err.statusCode) throw err;

      // FIX: Handle unique constraint on [planId, cycle]
      if (err.code === "P2002") {
        const e = new Error(
          `Pricing for "${data.cycle}" billing cycle already exists for this plan`
        );
        e.statusCode = 409;
        throw e;
      }
      throw err;
    }
  }

  /**
   * Get pricing by ID
   */
  async getById(id) {
    const pricing = await prisma.servicePricing.findUnique({
      where: { id },
    });

    if (!pricing) {
      const err = new Error("Pricing not found");
      err.statusCode = 404;
      throw err;
    }

    return pricing;
  }

  /**
   * Update pricing
   * - Validates pricing exists
   */
  async update(id, data, actor) {
    const pricing = await this.getById(id);

    const updateData = {};
    if (data.price !== undefined) updateData.price = data.price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.active !== undefined) updateData.active = data.active;

    if (Object.keys(updateData).length === 0) {
      const err = new Error("No fields to update");
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.servicePricing.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Soft delete pricing (set active to false)
   */
  async delete(id, actor) {
    const pricing = await this.getById(id);

    const updated = await prisma.servicePricing.update({
      where: { id },
      data: { active: false },
    });

    return updated;
  }

  /**
   * Get pricing by plan ID (admin - includes inactive)
   */
  async getByPlanId(planId) {
    // Validate plan exists
    const plan = await prisma.servicePlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      const err = new Error("Plan not found");
      err.statusCode = 404;
      throw err;
    }

    return prisma.servicePricing.findMany({
      where: { planId },
      orderBy: { cycle: "asc" },
    });
  }

  /**
   * Get active pricing by plan ID (client view)
   * ✅ FIXED: Now validates that PLAN is also active
   * Clients should only see pricing for active plans
   */
  async getActiveByPlanId(planId) {
    // Validate plan exists
    const plan = await prisma.servicePlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      const err = new Error("Plan not found");
      err.statusCode = 404;
      throw err;
    }

    // ✅ NEW: Check that plan is active
    // Only show pricing if plan is currently active
    if (!plan.active) {
      const err = new Error("Plan is currently inactive");
      err.statusCode = 404;
      throw err;
    }

    // Only return pricing if BOTH plan and pricing are active
    return prisma.servicePricing.findMany({
      where: {
        planId,
        active: true,
      },
      orderBy: { cycle: "asc" },
    });
  }

  async getComparison(serviceId) {
    return prisma.servicePricing.findMany({
      where: { plan: { serviceId } },
      include: { plan: true },
      orderBy: { cycle: "asc" },
    });
  }
}

module.exports = new ServicePricingService();