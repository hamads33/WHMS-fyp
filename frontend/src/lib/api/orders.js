// lib/api/orders.js
import { apiFetch } from "./client";

// ─────────────────────────────────────────────────────────────
// ADMIN — Order Management
// ─────────────────────────────────────────────────────────────

export const AdminOrdersAPI = {

  async listOrders(params = {}) {
    // params: { status, clientId, limit, offset }
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/admin/orders${query ? `?${query}` : ""}`);
  },

  async getOrderStats() {
    return apiFetch("/admin/orders/stats");
  },

  /**
   * Returns order with snapshot and costBreakdown.
   * snapshot.features is a keyed map — use normalizeSnapshot() from services.js to render.
   * costBreakdown shape: { base, addons, setup, discount, total }
   */
  async getOrder(orderId) {
    return apiFetch(`/admin/orders/${orderId}`);
  },

  /**
   * Full detail: service info, plan, pricing with all fees, addons, features, policies, costBreakdown.
   * snapshot.features is a keyed map — use normalizeSnapshot() from services.js to render.
   */
  async getOrderDetails(orderId) {
    return apiFetch(`/admin/orders/${orderId}/details`);
  },

  async activateOrder(orderId) {
    return apiFetch(`/admin/orders/${orderId}/activate`, { method: "POST" });
  },

  async suspendOrder(orderId, reason) {
    return apiFetch(`/admin/orders/${orderId}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async resumeOrder(orderId) {
    return apiFetch(`/admin/orders/${orderId}/resume`, { method: "POST" });
  },

  async renewOrder(orderId) {
    return apiFetch(`/admin/orders/${orderId}/renew`, { method: "POST" });
  },

  async terminateOrder(orderId, reason) {
    return apiFetch(`/admin/orders/${orderId}/terminate`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
};

// ─────────────────────────────────────────────────────────────
// CLIENT — Orders
// ─────────────────────────────────────────────────────────────

export const ClientOrdersAPI = {

  async placeOrder(data) {
    // data: { serviceId, planId, pricingId, addons[{addonId, quantity}], billingCycles, quantity }
    return apiFetch("/client/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async listOrders(params = {}) {
    // params: { status, limit, offset }
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/client/orders${query ? `?${query}` : ""}`);
  },

  async getSpend() {
    return apiFetch("/client/orders/spend");
  },

  /**
   * Returns order with costBreakdown: { base, addons, setup, discount, total }.
   * snapshot.features is a keyed map — use normalizeSnapshot() from services.js to render.
   * Returns 403 if not owner.
   */
  async getOrder(orderId) {
    return apiFetch(`/client/orders/${orderId}`);
  },

  /**
   * Full snapshot detail: service, plan, pricing, addons, features, policies, costBreakdown.
   * snapshot.features is a keyed map — use normalizeSnapshot() from services.js to render.
   */
  async getOrderDetails(orderId) {
    return apiFetch(`/client/orders/${orderId}/details`);
  },

  async cancelOrder(orderId) {
    return apiFetch(`/client/orders/${orderId}/cancel`, { method: "POST" });
  },

  async renewOrder(orderId) {
    return apiFetch(`/client/orders/${orderId}/renew`, { method: "POST" });
  },
};
