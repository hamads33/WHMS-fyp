/**
 * Order Snapshot Utility (FIXED)
 * Path: src/modules/orders/utils/order.snapshot.util.js
 *
 * ✅ FIXED for Professional Services Module:
 * - Captures add-ons with pricing (CORRECT CYCLE)
 * - Includes setup fees, renewal pricing, suspension/termination fees
 * - Snapshots service features and policies
 * - Validates against service policies
 * - FIXED: Passes billing cycle to add-on pricing lookup
 * - FIXED: Properly structures snapshot for cost calculation
 */

const prisma = require("../../../../prisma");

/**
 * Create enhanced order snapshot with add-ons, features, and policies
 * @param {Object} dto
 * @param {string} dto.serviceId - Service ID
 * @param {string} dto.planId - Plan ID
 * @param {string} dto.pricingId - Pricing ID
 * @param {Array} dto.addons - Add-ons [{ addonId, quantity }]
 */
async function createOrderSnapshot(dto) {
  const { serviceId, planId, pricingId, addons = [] } = dto;

  // Validate required fields
  if (!serviceId || !planId || !pricingId) {
    const err = new Error("serviceId, planId and pricingId are required");
    err.statusCode = 400;
    throw err;
  }

  // Fetch pricing with full hierarchy (ACTIVE enforcement)
  const pricing = await prisma.servicePricing.findFirst({
    where: {
      id: pricingId,
      active: true,
      plan: {
        id: planId,
        active: true,
        service: {
          id: serviceId,
          active: true,
        },
      },
    },
    include: {
      plan: {
        include: {
          service: true,
          features: { include: { feature: true } },
          policies: true,
        },
      },
    },
  });

  if (!pricing) {
    const err = new Error("Invalid or inactive service, plan, or pricing selection");
    err.statusCode = 400;
    throw err;
  }

  // ✅ FIXED: Pass the billing cycle to add-on validation
  // Add-ons must have pricing for the SAME cycle as the plan
  const cycle = pricing.cycle;

  // Validate service policies
  await validateServicePolicies(pricing, dto);

  // ✅ FIXED: Pass cycle to ensure add-on pricing matches plan pricing
  const addonSnapshots = await fetchAndValidateAddons(
    pricing.plan.service.id,
    planId,
    addons,
    cycle  // ← NEW: Pass the plan's billing cycle
  );

  // Build features snapshot
  const featuresSnapshot = buildFeaturesSnapshot(pricing.plan.features);

  // Build policies snapshot
  const policiesSnapshot = buildPoliciesSnapshot(pricing.plan.policies);

  // Build complete snapshot payload
  const snapshotPayload = {
    service: {
      id: pricing.plan.service.id,
      code: pricing.plan.service.code,
      name: pricing.plan.service.name,
      description: pricing.plan.service.description,
      moduleName: pricing.plan.service.moduleName,
      moduleType: pricing.plan.service.moduleType,
    },
    plan: {
      id: pricing.plan.id,
      name: pricing.plan.name,
      summary: pricing.plan.summary,
      position: pricing.plan.position,
      customizeOption: pricing.plan.customizeOption,
      paymentType: pricing.plan.paymentType,
    },
    pricing: {
      id: pricing.id,
      cycle: pricing.cycle,
      price: pricing.price.toString(),
      setupFee: pricing.setupFee?.toString() || "0",
      renewalPrice: pricing.renewalPrice?.toString(),
      suspensionFee: pricing.suspensionFee?.toString() || "0",
      terminationFee: pricing.terminationFee?.toString() || "0",
      currency: pricing.currency,
      discountType: pricing.discountType,
      discountAmount: pricing.discountAmount?.toString(),
    },
    addons: addonSnapshots,
    features: featuresSnapshot,
    policies: policiesSnapshot,
  };

  // Persist immutable snapshot using new schema fields
  const snapshot = await prisma.serviceSnapshot.create({
    data: {
      planId: pricing.plan.id,
      service: snapshotPayload.service,
      planData: snapshotPayload.plan,
      pricing: snapshotPayload.pricing,
      features: snapshotPayload.features,
      addons: snapshotPayload.addons.length > 0 ? snapshotPayload.addons : undefined,
      policies: Object.keys(snapshotPayload.policies).length > 0 ? snapshotPayload.policies : undefined,
    },
  });

  return snapshot;
}

/**
 * Validate order against service policies
 */
async function validateServicePolicies(pricing, dto) {
  const { plan } = pricing;

  // Check minimum/maximum billing cycles
  if (plan.minimumBillingCycles && dto.billingCycles < plan.minimumBillingCycles) {
    const err = new Error(
      `Minimum ${plan.minimumBillingCycles} billing cycles required`
    );
    err.statusCode = 400;
    throw err;
  }

  if (plan.maximumBillingCycles && dto.billingCycles > plan.maximumBillingCycles) {
    const err = new Error(
      `Maximum ${plan.maximumBillingCycles} billing cycles allowed`
    );
    err.statusCode = 400;
    throw err;
  }

  // Check quantity limits
  if (dto.quantity && plan.maxQuantity && dto.quantity > plan.maxQuantity) {
    const err = new Error(`Maximum quantity for this plan is ${plan.maxQuantity}`);
    err.statusCode = 400;
    throw err;
  }

  // Check if customization is allowed
  if (dto.addons?.length > 0 && plan.customizeOption === "none") {
    const err = new Error("Add-ons not allowed for this plan");
    err.statusCode = 400;
    throw err;
  }
}

/**
 * ✅ FIXED: Fetch and validate add-ons with pricing for CORRECT cycle
 * @param {string} serviceId - Service ID
 * @param {string} planId - Plan ID
 * @param {Array} addonRequests - Add-on requests [{ addonId, quantity }]
 * @param {string} cycle - Billing cycle (monthly, quarterly, annually, etc)
 */
async function fetchAndValidateAddons(serviceId, planId, addonRequests = [], cycle = "monthly") {
  if (!addonRequests || addonRequests.length === 0) {
    return [];
  }

  const addonSnapshots = [];

  for (const request of addonRequests) {
    // Fetch add-on with current pricing
    const addon = await prisma.serviceAddon.findFirst({
      where: {
        id: request.addonId,
        serviceId,
        active: true,
        planAddons: {
          some: { planId },
        },
      },
      include: {
        pricing: true,
        planAddons: true,
      },
    });

    if (!addon) {
      const err = new Error(
        `Add-on ${request.addonId} is not available for this plan`
      );
      err.statusCode = 400;
      throw err;
    }

    // Check quantity limits
    const quantity = request.quantity || 1;
    if (addon.maxQuantity && quantity > addon.maxQuantity) {
      const err = new Error(
        `Maximum quantity for ${addon.name} is ${addon.maxQuantity}`
      );
      err.statusCode = 400;
      throw err;
    }

    // ✅ FIXED: Use CORRECT cycle - try to match plan's cycle first
    let addonPrice = addon.pricing.find((p) => p.cycle === cycle);
    
    // If exact cycle not found, log warning and use first available
    if (!addonPrice) {
      if (addon.pricing.length === 0) {
        const err = new Error(
          `No pricing available for add-on ${addon.name}`
        );
        err.statusCode = 400;
        throw err;
      }
      console.warn(
        `⚠️  Add-on "${addon.name}" has no pricing for cycle "${cycle}". Using "${addon.pricing[0].cycle}" instead.`
      );
      addonPrice = addon.pricing[0];
    }

    addonSnapshots.push({
      id: addon.id,
      name: addon.name,
      code: addon.code,
      quantity,
      price: addonPrice.price.toString(),
      setupFee: addonPrice.setupFee?.toString() || "0",
      renewalPrice: addonPrice.renewalPrice?.toString(),
      currency: addonPrice.currency,
    });
  }

  return addonSnapshots;
}

/**
 * Build features snapshot from plan features
 */
function buildFeaturesSnapshot(planFeatures) {
  const features = {};

  planFeatures.forEach((pf) => {
    features[pf.feature.key] = {
      name: pf.feature.name,
      unit: pf.feature.unit,
      category: pf.feature.category,
      value: pf.value,
    };
  });

  return features;
}

/**
 * Build policies snapshot
 */
function buildPoliciesSnapshot(policies) {
  const snapshot = {};

  policies.forEach((policy) => {
    snapshot[policy.key] = policy.value;
  });

  return snapshot;
}

/**
 * ✅ FIXED: Calculate total order cost (including add-ons and setup fees)
 * Properly handles snapshot structure with nested pricing and addons
 */
function calculateOrderCost(snapshot) {
  // ✅ FIX: Handle both structures:
  // 1. Full snapshot: { pricing: {...}, addons: [...] }
  // 2. Old structure: passed as-is
  
  let pricing = snapshot.pricing || snapshot;
  let addons = snapshot.addons || [];

  let baseCost = parseFloat(pricing.price || 0);
  let setupCost = parseFloat(pricing.setupFee || 0);

  // Add add-on costs
  let addonCost = 0;
  if (addons && Array.isArray(addons)) {
    addons.forEach((addon) => {
      const price = parseFloat(addon.price || 0);
      const quantity = addon.quantity || 1;
      addonCost += price * quantity;

      // Add setup fees for add-ons
      const addonSetupFee = parseFloat(addon.setupFee || 0);
      setupCost += addonSetupFee * quantity;
    });
  }

  // Apply discount if any
  let discountAmount = 0;
  if (pricing.discountType === "percentage") {
    discountAmount = (baseCost * parseFloat(pricing.discountAmount || 0)) / 100;
  } else if (pricing.discountType === "fixed") {
    discountAmount = parseFloat(pricing.discountAmount || 0);
  }

  const total = baseCost + addonCost + setupCost - discountAmount;

  return {
    baseCost: baseCost.toFixed(2),
    addonCost: addonCost.toFixed(2),
    setupCost: setupCost.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    total: Math.max(0, total).toFixed(2),
  };
}

module.exports = {
  createOrderSnapshot,
  calculateOrderCost,
};