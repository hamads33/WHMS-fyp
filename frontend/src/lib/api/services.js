// lib/api/services.js
import { apiFetch } from "./client";

// ─────────────────────────────────────────────────────────────
// ADMIN — Service Management
// ─────────────────────────────────────────────────────────────

export const AdminServicesAPI = {

  // ── Service Groups ──────────────────────────────────────────

  async listGroups() {
    return apiFetch("/admin/services/groups");
  },

  async createGroup(data) {
    // data: { name, description, icon, position }
    return apiFetch("/admin/services/groups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async reorderGroups(groupIds) {
    return apiFetch("/admin/services/groups/reorder", {
      method: "POST",
      body: JSON.stringify({ groupIds }),
    });
  },

  async toggleGroupVisibility(groupId) {
    return apiFetch(`/admin/services/groups/${groupId}/toggle-visibility`, {
      method: "POST",
    });
  },

  async deleteGroup(groupId) {
    return apiFetch(`/admin/services/groups/${groupId}`, {
      method: "DELETE",
    });
  },

  async getGroup(groupId) {
    return apiFetch(`/admin/services/groups/${groupId}`);
  },

  async updateGroup(groupId, data) {
    // data: { name, description, icon, position, active, hidden }
    return apiFetch(`/admin/services/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async getGroupStats(groupId) {
    return apiFetch(`/admin/services/groups/${groupId}/stats`);
  },

  async bulkUpdateGroups(ids, data) {
    return apiFetch("/admin/services/groups/bulk-update", {
      method: "POST",
      body: JSON.stringify({ ids, data }),
    });
  },

  async bulkDeleteGroups(ids) {
    return apiFetch("/admin/services/groups/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  // ── Services ─────────────────────────────────────────────────

  async listServices() {
    return apiFetch("/admin/services");
  },

  async createService(data) {
    // data: { code, name, description, groupId, moduleType, paymentType, customizeOption, taxable }
    return apiFetch("/admin/services", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async bulkUpdateServices(ids, data) {
    return apiFetch("/admin/services/bulk-update", {
      method: "POST",
      body: JSON.stringify({ ids, data }),
    });
  },

  async bulkDeleteServices(ids) {
    return apiFetch("/admin/services/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  async importServices(servicesArray) {
    return apiFetch("/admin/services/import", {
      method: "POST",
      body: JSON.stringify(servicesArray),
    });
  },

  async exportServices() {
    return apiFetch("/admin/services/export");
  },

  async getService(serviceId) {
    return apiFetch(`/admin/services/${serviceId}`);
  },

  async updateService(serviceId, data) {
    // data: { name, description, groupId, moduleName, paymentType, active, hidden }
    return apiFetch(`/admin/services/${serviceId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteService(serviceId) {
    return apiFetch(`/admin/services/${serviceId}`, {
      method: "DELETE",
    });
  },

  async hardDeleteService(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/hard`, {
      method: "DELETE",
    });
  },

  async bulkHardDeleteServices(ids) {
    return apiFetch("/admin/services/bulk-hard-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  async toggleServiceVisibility(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/toggle-visibility`, {
      method: "POST",
    });
  },

  async getServiceComparison(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/comparison`);
  },

  async getServiceStats(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/stats`);
  },

  // ── Plans ────────────────────────────────────────────────────

  async listPlans(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/plans`);
  },

  async createPlan(serviceId, data) {
    // data: { name, summary, customizeOption, paymentType, maxQuantity, stockLimit, position }
    return apiFetch(`/admin/services/${serviceId}/plans`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async bulkUpdatePlans(ids, data) {
    return apiFetch("/admin/plans/bulk-update", {
      method: "POST",
      body: JSON.stringify({ ids, data }),
    });
  },

  async importPlans(serviceId, plansArray) {
    return apiFetch(`/admin/plans/import/${serviceId}`, {
      method: "POST",
      body: JSON.stringify(plansArray),
    });
  },

  async exportPlans(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/plans/export`);
  },

  async getPlan(planId) {
    return apiFetch(`/admin/plans/${planId}`);
  },

  async updatePlan(planId, data) {
    // data: { name, summary, customizeOption, maxQuantity, stockLimit, active, hidden, position }
    return apiFetch(`/admin/plans/${planId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async activatePlan(planId) {
    return apiFetch(`/admin/plans/${planId}/activate`, { method: "POST" });
  },

  async deactivatePlan(planId) {
    return apiFetch(`/admin/plans/${planId}/deactivate`, { method: "POST" });
  },

  async togglePlanStatus(planId) {
    return apiFetch(`/admin/plans/${planId}/toggle-status`, { method: "POST" });
  },

  async togglePlanVisibility(planId) {
    return apiFetch(`/admin/plans/${planId}/toggle-visibility`, { method: "POST" });
  },

  async getPlanComparison(planId) {
    return apiFetch(`/admin/plans/${planId}/comparison`);
  },

  async getPlanStats(planId) {
    return apiFetch(`/admin/plans/${planId}/stats`);
  },

  // ── Pricing ──────────────────────────────────────────────────

  async listPricing(planId) {
    return apiFetch(`/admin/plans/${planId}/pricing`);
  },

  async createPricing(planId, data) {
    // data: { cycle, price, setupFee, renewalPrice, suspensionFee, terminationFee, currency, discountType, discountAmount }
    return apiFetch(`/admin/plans/${planId}/pricing`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getPricing(pricingId) {
    return apiFetch(`/admin/pricing/${pricingId}`);
  },

  async updatePricing(pricingId, data) {
    // data: { price, setupFee, renewalPrice, suspensionFee, currency, discountType, discountAmount, active }
    return apiFetch(`/admin/pricing/${pricingId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deletePricing(pricingId) {
    return apiFetch(`/admin/pricing/${pricingId}`, { method: "DELETE" });
  },

  async getPricingComparison(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/pricing/comparison`);
  },

  // ── Features ─────────────────────────────────────────────────

  async listFeatures(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/features`);
  },

  async createFeature(serviceId, data) {
    // data: { key, name, description, type, unit, icon, category, position }
    return apiFetch(`/admin/services/${serviceId}/features`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Returns a matrix object — NOT a flat array.
   * Raw shape:
   * {
   *   service: { id, name, code },
   *   plans:   [{ id, name, position }, ...],
   *   features: {
   *     [featureKey]: { name, description, unit, icon, category,
   *                     values: { [planId]: value } }
   *   }
   * }
   * Use normalizeFeaturesMatrix() to convert features → array for table rendering.
   */
  async getFeaturesComparison(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/features/comparison`);
  },

  async getFeaturesByCategory(serviceId, category) {
    return apiFetch(`/admin/services/${serviceId}/features/category/${category}`);
  },

  async getFeature(featureId) {
    return apiFetch(`/admin/features/${featureId}`);
  },

  async updateFeature(featureId, data) {
    // data: { name, description, unit, icon, category, active, position }
    return apiFetch(`/admin/features/${featureId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteFeature(featureId) {
    return apiFetch(`/admin/features/${featureId}`, { method: "DELETE" });
  },

  async reorderFeatures(featureIds) {
    return apiFetch("/admin/features/reorder", {
      method: "POST",
      body: JSON.stringify({ featureIds }),
    });
  },

  async setFeatureValue(featureId, planId, value) {
    return apiFetch(`/admin/features/${featureId}/plans/${planId}/value`, {
      method: "POST",
      body: JSON.stringify({ value }),
    });
  },

  /**
   * Returns a keyed map — NOT an array.
   * Raw shape: { [featureKey]: { name, unit, value, icon } }
   * Use normalizePlanFeatures() to convert → array for list/table rendering.
   */
  async getPlanFeatures(planId) {
    return apiFetch(`/admin/plans/${planId}/features`);
  },

  // ── Add-ons ──────────────────────────────────────────────────

  async listAddons(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/addons`);
  },

  async createAddon(serviceId, data) {
    // data: { name, description, code, setupFee, monthlyPrice, currency, maxQuantity, required, recurring, billingType, position }
    return apiFetch(`/admin/services/${serviceId}/addons`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getAddon(addonId) {
    return apiFetch(`/admin/addons/${addonId}`);
  },

  async getAddonDetailed(addonId) {
    return apiFetch(`/admin/addons/${addonId}/detailed`);
  },

  async updateAddon(addonId, data) {
    // data: { name, description, setupFee, monthlyPrice, currency, maxQuantity, required, active, position }
    return apiFetch(`/admin/addons/${addonId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteAddon(addonId) {
    return apiFetch(`/admin/addons/${addonId}`, { method: "DELETE" });
  },

  async toggleAddonActive(addonId) {
    return apiFetch(`/admin/addons/${addonId}/toggle-active`, { method: "POST" });
  },

  async reorderAddons(addonIds) {
    return apiFetch("/admin/addons/reorder", {
      method: "POST",
      body: JSON.stringify({ addonIds }),
    });
  },

  async createAddonPricing(addonId, data) {
    // data: { cycle, price, setupFee, renewalPrice, currency }
    return apiFetch(`/admin/addons/${addonId}/pricing`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async attachAddonToPlan(addonId, planId, data) {
    // data: { included, quantity }
    return apiFetch(`/admin/addons/${addonId}/plans/${planId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async detachAddonFromPlan(addonId, planId) {
    return apiFetch(`/admin/addons/${addonId}/plans/${planId}`, {
      method: "DELETE",
    });
  },

  // ── Automations ──────────────────────────────────────────────

  async listAutomations(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/automations`);
  },

  async createAutomation(serviceId, data) {
    // data: { event, action, module, provisioningKey, webhookUrl, emailTemplate, config, priority }
    return apiFetch(`/admin/services/${serviceId}/automations`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getAutomationsByEvent(serviceId, event) {
    return apiFetch(`/admin/services/${serviceId}/automations/event/${event}`);
  },

  async createProvisioningAutomation(serviceId, data) {
    // data: { module, config }
    return apiFetch(`/admin/services/${serviceId}/automations/provisioning`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async createEmailAutomation(serviceId, data) {
    // data: { event, template }
    return apiFetch(`/admin/services/${serviceId}/automations/email`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async createWebhookAutomation(serviceId, data) {
    // data: { event, webhookUrl }
    return apiFetch(`/admin/services/${serviceId}/automations/webhook`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async listAvailableEvents() {
    return apiFetch("/admin/automations/available-events");
  },

  async listAvailableActions() {
    return apiFetch("/admin/automations/available-actions");
  },

  async listAvailableModules() {
    return apiFetch("/admin/automations/available-modules");
  },

  async getAutomation(automationId) {
    return apiFetch(`/admin/automations/${automationId}`);
  },

  async updateAutomation(automationId, data) {
    return apiFetch(`/admin/automations/${automationId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteAutomation(automationId) {
    return apiFetch(`/admin/automations/${automationId}`, { method: "DELETE" });
  },

  async toggleAutomation(automationId) {
    return apiFetch(`/admin/automations/${automationId}/toggle`, { method: "POST" });
  },

  // ── Custom Fields ────────────────────────────────────────────

  async listCustomFields(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/custom-fields`);
  },

  async createCustomField(serviceId, data) {
    return apiFetch(`/admin/services/${serviceId}/custom-fields`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateCustomField(serviceId, fieldId, data) {
    return apiFetch(`/admin/services/${serviceId}/custom-fields/${fieldId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteCustomField(serviceId, fieldId) {
    return apiFetch(`/admin/services/${serviceId}/custom-fields/${fieldId}`, {
      method: "DELETE",
    });
  },

  async reorderCustomFields(serviceId, fields) {
    return apiFetch(`/admin/services/${serviceId}/custom-fields/reorder`, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });
  },

  // ── Cross-sells ──────────────────────────────────────────────

  async listCrossSells(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/cross-sells`);
  },

  async addCrossSell(serviceId, crossSellServiceId) {
    return apiFetch(`/admin/services/${serviceId}/cross-sells`, {
      method: "POST",
      body: JSON.stringify({ crossSellServiceId }),
    });
  },

  async removeCrossSell(serviceId, crossSellServiceId) {
    return apiFetch(`/admin/services/${serviceId}/cross-sells/${crossSellServiceId}`, {
      method: "DELETE",
    });
  },

  // ── Upgrade Paths ────────────────────────────────────────────

  async listUpgradePaths(serviceId) {
    return apiFetch(`/admin/services/${serviceId}/upgrade-paths`);
  },

  async createUpgradePath(serviceId, data) {
    return apiFetch(`/admin/services/${serviceId}/upgrade-paths`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateUpgradePath(serviceId, pathId, data) {
    return apiFetch(`/admin/services/${serviceId}/upgrade-paths/${pathId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteUpgradePath(serviceId, pathId) {
    return apiFetch(`/admin/services/${serviceId}/upgrade-paths/${pathId}`, {
      method: "DELETE",
    });
  },
};

// ─────────────────────────────────────────────────────────────
// CLIENT — Service Catalog (Public Storefront)
// ─────────────────────────────────────────────────────────────

export const ClientServicesAPI = {

  async listServices() {
    return apiFetch("/client/services");
  },

  async getService(serviceId) {
    return apiFetch(`/client/services/${serviceId}`);
  },

  async listPlans(serviceId) {
    return apiFetch(`/client/services/${serviceId}/plans`);
  },

  async listPricing(planId) {
    return apiFetch(`/client/plans/${planId}/pricing`);
  },
};

// ─────────────────────────────────────────────────────────────
// NORMALIZERS — convert non-array response shapes for UI use
// ─────────────────────────────────────────────────────────────

/**
 * Converts the getFeaturesComparison() response into a renderable form.
 *
 * Raw: features is a keyed object  → { [featureKey]: { name, unit, ... values: { [planId]: value } } }
 * Out: features is a flat array    → [{ key, name, description, unit, icon, category, values }]
 *
 * Usage:
 *   const raw = await AdminServicesAPI.getFeaturesComparison(serviceId);
 *   const { service, plans, features } = normalizeFeaturesMatrix(raw);
 *   features.map(f => f.values[plan.id])   // safe to iterate
 */
export function normalizeFeaturesMatrix(comparison) {
  return {
    service: comparison.service,
    plans: comparison.plans,
    features: Object.entries(comparison.features ?? {}).map(([key, feat]) => ({
      key,
      name: feat.name,
      description: feat.description ?? null,
      unit: feat.unit ?? null,
      icon: feat.icon ?? null,
      category: feat.category ?? null,
      values: feat.values ?? {},
    })),
  };
}

/**
 * Converts the getPlanFeatures() response into a renderable array.
 *
 * Raw: { [featureKey]: { name, unit, value, icon } }
 * Out: [{ key, name, unit, value, icon }]
 *
 * Usage:
 *   const raw = await AdminServicesAPI.getPlanFeatures(planId);
 *   const features = normalizePlanFeatures(raw);
 *   features.map(f => f.value)   // safe to iterate
 */
export function normalizePlanFeatures(featuresMap) {
  return Object.entries(featuresMap ?? {}).map(([key, feat]) => ({
    key,
    name: feat.name,
    unit: feat.unit ?? null,
    value: feat.value ?? null,
    icon: feat.icon ?? null,
  }));
}

/**
 * Normalizes the snapshot.features blob stored on order snapshots.
 * Snapshot features use the same map shape as getPlanFeatures().
 *
 * Snapshot shape (from ServiceSnapshotService):
 * {
 *   service:  { id, name, code, moduleName },
 *   planData: { id, name, summary, customizeOption, paymentType },
 *   pricing:  [{ cycle, price, setupFee, renewalPrice, suspensionFee, terminationFee, currency }],
 *   features: { [featureKey]: { name, unit, value, icon } },
 *   policies: [{ key, value, enforced }],
 * }
 *
 * Usage:
 *   const { service, planData, pricing, features, policies } = normalizeSnapshot(order.snapshot);
 *   features.map(f => f.value)   // safe to iterate
 */
export function normalizeSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    service: snapshot.service ?? null,
    planData: snapshot.planData ?? null,
    pricing: snapshot.pricing ?? [],
    features: normalizePlanFeatures(snapshot.features),
    policies: snapshot.policies ?? [],
  };
}
