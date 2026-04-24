const prisma = require("../../../../prisma");

class ServiceSnapshotService {
  /**
   * Create a snapshot of current service/plan/pricing state
   * Used when creating orders to lock in pricing and features
   */
  async createSnapshot(serviceId, planId, actor) {
    try {
      // Get service details
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        const err = new Error("Service not found");
        err.statusCode = 404;
        throw err;
      }

      // Get plan details
      const plan = await prisma.servicePlan.findUnique({
        where: { id: planId },
        include: { pricing: true, policies: true },
      });

      if (!plan) {
        const err = new Error("Plan not found");
        err.statusCode = 404;
        throw err;
      }

      // Validate plan belongs to service
      if (plan.serviceId !== serviceId) {
        const err = new Error("Plan does not belong to this service");
        err.statusCode = 400;
        throw err;
      }

      // Build snapshot payload
      const snapshot = {
        service: {
          id: service.id,
          code: service.code,
          name: service.name,
          description: service.description,
        },
        plan: {
          id: plan.id,
          name: plan.name,
          summary: plan.summary,
        },
        pricing: plan.pricing.map((p) => ({
          id: p.id,
          cycle: p.cycle,
          price: p.price,
          currency: p.currency,
        })),
        policies: plan.policies.map((p) => ({
          id: p.id,
          key: p.key,
          value: p.value,
          enforced: p.enforced,
        })),
        capturedAt: new Date().toISOString(),
      };

      // Store snapshot using new schema fields
      const storedSnapshot = await prisma.serviceSnapshot.create({
        data: {
          planId,
          service: snapshot.service,
          planData: snapshot.plan,
          pricing: snapshot.pricing,
          features: {},
          policies: snapshot.policies?.length > 0 ? snapshot.policies : undefined,
        },
      });

      return storedSnapshot;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get snapshot by ID
   */
  async getById(id) {
    const snapshot = await prisma.serviceSnapshot.findUnique({
      where: { id },
    });

    if (!snapshot) {
      const err = new Error("Snapshot not found");
      err.statusCode = 404;
      throw err;
    }

    return snapshot;
  }

  /**
   * Get snapshots for a service (via its plans)
   */
  async getByServiceId(serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { plans: { select: { id: true } } },
    });

    if (!service) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    const planIds = service.plans.map((p) => p.id);
    return prisma.serviceSnapshot.findMany({
      where: { planId: { in: planIds } },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get snapshots for a specific plan
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

    return prisma.serviceSnapshot.findMany({
      where: { planId },
      orderBy: { createdAt: "desc" },
    });
  }
}

module.exports = new ServiceSnapshotService();