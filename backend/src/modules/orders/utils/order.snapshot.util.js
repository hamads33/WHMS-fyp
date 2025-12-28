const prisma = require("../../../../prisma");

/**
 * Create immutable snapshot for order
 * Reuses Services module snapshot structure
 */
async function createOrderSnapshot({ serviceId, planId, pricingId }) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  const plan = await prisma.servicePlan.findUnique({
    where: { id: planId },
  });

  const pricing = await prisma.servicePricing.findUnique({
    where: { id: pricingId },
  });

  if (!service || !plan || !pricing) {
    throw new Error("Invalid service, plan, or pricing reference");
  }

  return prisma.serviceSnapshot.create({
    data: {
      serviceId,
      planId,
      snapshot: {
        service,
        plan,
        pricing,
        capturedAt: new Date().toISOString(),
      },
    },
  });
}

module.exports = { createOrderSnapshot };
