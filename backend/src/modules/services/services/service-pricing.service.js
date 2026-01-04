const prisma = require("../../../../prisma");

class ServicePricingService {
  /**
   * Create pricing
   * - Validates plan exists
   * - Prevents duplicate pricing per billing cycle
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
          cycle: data.cycle,
          price: data.price,
          currency: data.currency || "USD",
          active: true,
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
   * FIX: Only check if PRICING is active, not if plan is active
   * This allows clients to see pricing even if plan is temporarily inactive
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

    // FIX: Only filter by pricing.active, not plan.active
    // This way clients can see pricing for a plan even if temporarily deactivated
    return prisma.servicePricing.findMany({
      where: { 
        planId,
        active: true 
      },
      orderBy: { cycle: "asc" },
    });
  }
}

module.exports = new ServicePricingService();