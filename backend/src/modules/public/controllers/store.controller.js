/**
 * Store Controller — truly public, no API key required.
 * Powers the WHMS-native hosted storefront (/store).
 *
 * GET /api/store/plans          — all active plans grouped by service
 * GET /api/store/services       — all public-facing services with plans
 * GET /api/store/services/:id   — single service with plans + pricing
 */
const prisma = require("../../../../prisma");

const StoreController = {

  async listServices(req, res) {
    try {
      const services = await prisma.service.findMany({
        where: { active: true },
        include: {
          plans: {
            where: { active: true },
            include: {
              pricing: { where: { active: true }, orderBy: { price: "asc" } },
              features: true,
              policies: true,
            },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const normalized = services.map(svc => ({
        ...svc,
        plans: svc.plans.map(plan => ({
          ...plan,
          pricing: plan.pricing.map(p => ({ ...p, billingCycle: p.cycle })),
        })),
      }));

      return res.json({ success: true, services: normalized });
    } catch (err) {
      console.error("[Store] listServices error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch services" });
    }
  },

  async getService(req, res) {
    try {
      const service = await prisma.service.findUnique({
        where: { id: req.params.id },
        include: {
          plans: {
            where: { active: true },
            include: {
              pricing:  { where: { active: true }, orderBy: { price: "asc" } },
              features: true,
              policies: true,
            },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!service || !service.active) {
        return res.status(404).json({ success: false, error: "Service not found" });
      }

      const normalized = {
        ...service,
        plans: service.plans.map(plan => ({
          ...plan,
          pricing: plan.pricing.map(p => ({ ...p, billingCycle: p.cycle })),
        })),
      };

      return res.json({ success: true, service: normalized });
    } catch (err) {
      console.error("[Store] getService error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch service" });
    }
  },

  async listPlans(req, res) {
    try {
      const { serviceId } = req.query;
      const where = { active: true };
      if (serviceId) where.serviceId = serviceId;

      const plans = await prisma.servicePlan.findMany({
        where,
        include: {
          pricing:  { where: { active: true }, orderBy: { price: "asc" } },
          features: true,
          policies: true,
          service:  { select: { id: true, name: true, description: true, active: true } },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });

      const normalized = plans
        .filter(p => p.service?.active)
        .map(plan => ({
          ...plan,
          pricing: plan.pricing.map(p => ({ ...p, billingCycle: p.cycle })),
        }));

      return res.json({ success: true, plans: normalized });
    } catch (err) {
      console.error("[Store] listPlans error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch plans" });
    }
  },
};

module.exports = StoreController;
