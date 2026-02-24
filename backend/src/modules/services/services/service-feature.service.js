/**
 * Service Feature Service
 * Path: src/modules/services/services/service-feature.service.js
 * 
 * Manages service features (disk space, bandwidth, etc.)
 * Used for plan comparison and feature matrices
 */

const prisma = require("../../../../prisma");

class ServiceFeatureService {
  /**
   * Create a new feature for a service
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

      const feature = await prisma.serviceFeature.create({
        data: {
          serviceId,
          key: data.key,
          name: data.name,
          description: data.description,
          type: data.type || "text",
          unit: data.unit,
          icon: data.icon,
          category: data.category,
          active: true,
          position: data.position || 0,
        },
      });

      return feature;
    } catch (err) {
      if (err.statusCode) throw err;

      if (err.code === "P2002") {
        const e = new Error(
          `Feature key "${data.key}" already exists for this service`
        );
        e.statusCode = 409;
        throw e;
      }
      throw err;
    }
  }

  /**
   * Get feature by ID
   */
  async getById(id) {
    const feature = await prisma.serviceFeature.findUnique({
      where: { id },
      include: { planFeatures: true },
    });

    if (!feature) {
      const err = new Error("Feature not found");
      err.statusCode = 404;
      throw err;
    }

    return feature;
  }

  /**
   * Get all features for a service
   */
  async getByServiceId(serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    return prisma.serviceFeature.findMany({
      where: { serviceId, active: true },
      include: { planFeatures: true },
      orderBy: [{ category: "asc" }, { position: "asc" }],
    });
  }

  /**
   * Update feature
   */
  async update(id, data, actor) {
    const feature = await this.getById(id);

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.position !== undefined) updateData.position = data.position;

    if (Object.keys(updateData).length === 0) {
      const err = new Error("No fields to update");
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.serviceFeature.update({
      where: { id },
      data: updateData,
      include: { planFeatures: true },
    });

    return updated;
  }

  /**
   * Delete feature
   */
  async delete(id, actor) {
    const feature = await this.getById(id);

    // Check if feature is used in any plans
    if (feature.planFeatures.length > 0) {
      const err = new Error(
        "Cannot delete feature that is assigned to plans"
      );
      err.statusCode = 400;
      throw err;
    }

    await prisma.serviceFeature.delete({
      where: { id },
    });

    return { message: "Feature deleted successfully" };
  }

  /**
   * Set feature value for a plan
   */
  async setFeatureForPlan(featureId, planId, value, actor) {
    try {
      const feature = await this.getById(featureId);
      const plan = await prisma.servicePlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        const err = new Error("Plan not found");
        err.statusCode = 404;
        throw err;
      }

      // Validate feature belongs to service
      if (feature.serviceId !== plan.serviceId) {
        const err = new Error("Feature does not belong to this service");
        err.statusCode = 400;
        throw err;
      }

      // Upsert plan feature
      const planFeature = await prisma.servicePlanFeature.upsert({
        where: {
          planId_featureId: {
            planId,
            featureId,
          },
        },
        update: { value },
        create: {
          planId,
          featureId,
          value,
        },
      });

      return planFeature;
    } catch (err) {
      if (err.statusCode) throw err;
      throw err;
    }
  }

  /**
   * Get feature comparison across plans
   */
  async getComparison(serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    const features = await prisma.serviceFeature.findMany({
      where: { serviceId, active: true },
      include: {
        planFeatures: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: [{ category: "asc" }, { position: "asc" }],
    });

    const plans = await prisma.servicePlan.findMany({
      where: { serviceId, active: true },
      orderBy: { position: "asc" },
    });

    // Build comparison matrix
    const comparisonMatrix = {};

    features.forEach((feature) => {
      comparisonMatrix[feature.key] = {
        name: feature.name,
        description: feature.description,
        unit: feature.unit,
        icon: feature.icon,
        category: feature.category,
        values: {},
      };

      plans.forEach((plan) => {
        const planFeature = feature.planFeatures.find(
          (pf) => pf.planId === plan.id
        );
        comparisonMatrix[feature.key].values[plan.id] = planFeature?.value || "—";
      });
    });

    return {
      service: {
        id: service.id,
        name: service.name,
        code: service.code,
      },
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
      })),
      features: comparisonMatrix,
    };
  }

  /**
   * Get feature values for a plan
   */
  async getPlanFeatures(planId) {
    const plan = await prisma.servicePlan.findUnique({
      where: { id: planId },
      include: {
        features: {
          include: {
            feature: true,
          },
        },
      },
    });

    if (!plan) {
      const err = new Error("Plan not found");
      err.statusCode = 404;
      throw err;
    }

    const featureMap = {};
    plan.features.forEach((pf) => {
      featureMap[pf.feature.key] = {
        name: pf.feature.name,
        unit: pf.feature.unit,
        value: pf.value,
        icon: pf.feature.icon,
      };
    });

    return featureMap;
  }

  /**
   * Reorder features
   */
  async reorder(featureIds, actor) {
    const updates = featureIds.map((id, index) =>
      prisma.serviceFeature.update({
        where: { id },
        data: { position: index },
      })
    );

    return Promise.all(updates);
  }

  /**
   * Get features by category
   */
  async getByCategory(serviceId, category) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    return prisma.serviceFeature.findMany({
      where: {
        serviceId,
        category,
        active: true,
      },
      orderBy: { position: "asc" },
    });
  }

  /**
   * Validate feature value based on type
   */
  validateValue(feature, value) {
    switch (feature.type) {
      case "number":
        return !isNaN(parseFloat(value));
      case "boolean":
        return value === true || value === false || value === "true" || value === "false";
      case "select":
        return value !== null && value !== undefined && value !== "";
      case "text":
      default:
        return typeof value === "string" && value.length > 0;
    }
  }
}

module.exports = new ServiceFeatureService();