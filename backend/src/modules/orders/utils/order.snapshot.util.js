/**
 * Order Snapshot Utility
 * Path: src/modules/orders/utils/order.snapshot.util.js
 *
 * Responsibility:
 * - Validate service / plan / pricing integrity
 * - Enforce ACTIVE state at order time
 * - Create immutable snapshot for billing correctness
 */

const prisma = require("../../../../prisma");

/**
 * Create immutable order snapshot
 * @param {Object} dto
 * @param {string} dto.serviceId
 * @param {string} dto.planId
 * @param {string} dto.pricingId
 */
async function createOrderSnapshot(dto) {
  const { serviceId, planId, pricingId } = dto;

  // -------------------------------
  // Basic input validation
  // -------------------------------
  if (!serviceId || !planId || !pricingId) {
    const err = new Error("serviceId, planId and pricingId are required");
    err.statusCode = 400;
    throw err;
  }

  // -------------------------------
  // Fetch pricing with full hierarchy
  // ACTIVE ENFORCEMENT HERE
  // -------------------------------
  const pricing = await prisma.servicePricing.findFirst({
    where: {
      id: parseInt(pricingId),
      active: true,
      plan: {
        id: parseInt(planId),
        active: true,
        service: {
          id: parseInt(serviceId),
          active: true,
        },
      },
    },
    include: {
      plan: {
        include: {
          service: true,
        },
      },
    },
  });

  if (!pricing) {
    const err = new Error(
      "Invalid or inactive service, plan, or pricing selection"
    );
    err.statusCode = 400;
    throw err;
  }

  // -------------------------------
  // Build immutable snapshot payload
  // -------------------------------
  const snapshotPayload = {
    service: {
      id: pricing.plan.service.id,
      code: pricing.plan.service.code,
      name: pricing.plan.service.name,
      description: pricing.plan.service.description,
    },
    plan: {
      id: pricing.plan.id,
      name: pricing.plan.name,
      summary: pricing.plan.summary,
      position: pricing.plan.position,
    },
    pricing: {
      id: pricing.id,
      cycle: pricing.cycle,
      price: pricing.price.toString(),
      currency: pricing.currency,
    },
  };

  // -------------------------------
  // Persist snapshot (IMMUTABLE)
  // -------------------------------
  const snapshot = await prisma.serviceSnapshot.create({
    data: {
      serviceId: pricing.plan.service.id,
      planId: pricing.plan.id,
      snapshot: snapshotPayload,
    },
  });

  return snapshot;
}

module.exports = {
  createOrderSnapshot,
};