/**
 * Public Plans Controller
 * GET /public/v1/plans
 * GET /public/v1/plans/:planId
 *
 * Returns active plans with pricing — scoped to a serviceId if provided.
 */
const prisma = require("../../../../prisma");

const PlansController = {
  async list(req, res) {
    try {
      const { serviceId } = req.query;

      const where = { active: true };
      if (serviceId) where.serviceId = serviceId;

      const plans = await prisma.servicePlan.findMany({
        where,
        include: {
          pricing: { where: { active: true } },
          service: { select: { id: true, name: true, description: true } },
        },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      });

      // Normalize: SDK expects `billingCycle`, DB stores `cycle`
      const normalized = plans.map(plan => ({
        ...plan,
        pricing: plan.pricing.map(p => ({ ...p, billingCycle: p.cycle })),
      }));

      return res.json({ success: true, plans: normalized });
    } catch (err) {
      console.error("[Public] plans.list error:", err);
      return res.status(500).json({ error: "Failed to fetch plans" });
    }
  },

  async getById(req, res) {
    try {
      const plan = await prisma.servicePlan.findUnique({
        where: { id: req.params.planId },
        include: {
          pricing: { where: { active: true } },
          service: { select: { id: true, name: true, description: true } },
        },
      });

      if (!plan || !plan.active) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const normalized = {
        ...plan,
        pricing: plan.pricing.map(p => ({ ...p, billingCycle: p.cycle })),
      };

      return res.json({ success: true, plan: normalized });
    } catch (err) {
      console.error("[Public] plans.getById error:", err);
      return res.status(500).json({ error: "Failed to fetch plan" });
    }
  },
};

module.exports = PlansController;
