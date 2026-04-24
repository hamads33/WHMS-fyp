// lib/api/marketplace.js
// Marketplace API client — plugin marketplace, developer portal, and admin review

import { apiFetch } from "./client";

const MarketplaceAPI = {
  // ─────────────────────────────────────────────────────────────────
  // PUBLIC — no auth required
  // ─────────────────────────────────────────────────────────────────

  /** GET /api/marketplace/plugins — approved plugins listing */
  async listPlugins({ search, category, pricingType, minRating, capability } = {}) {
    const params = new URLSearchParams();
    if (search)      params.set("search", search);
    if (category)    params.set("category", category);
    if (pricingType) params.set("pricingType", pricingType);
    if (minRating)   params.set("minRating", minRating);
    if (capability)  params.set("capability", capability);
    const qs = params.toString();
    const res = await apiFetch(`/marketplace/plugins${qs ? `?${qs}` : ""}`);
    return res.data ?? [];
  },

  /** GET /api/marketplace/plugins/:slug */
  async getPluginBySlug(slug) {
    const res = await apiFetch(`/marketplace/plugins/${slug}`);
    return res.data ?? null;
  },

  /** GET /api/marketplace/plugins/:slug/stats */
  async getPluginStats(slug) {
    const res = await apiFetch(`/marketplace/plugins/${slug}/stats`);
    return res.data ?? {};
  },

  /** GET /api/marketplace/stats/top */
  async getTopPlugins(limit = 10) {
    const res = await apiFetch(`/marketplace/stats/top?limit=${limit}`);
    return res.data ?? [];
  },

  /** GET /api/marketplace/stats/most-installed */
  async getMostInstalled(limit = 10) {
    const res = await apiFetch(`/marketplace/stats/most-installed?limit=${limit}`);
    return res.data ?? [];
  },

  /** GET /api/marketplace/stats/highest-rated */
  async getHighestRated(limit = 10) {
    const res = await apiFetch(`/marketplace/stats/highest-rated?limit=${limit}`);
    return res.data ?? [];
  },

  // ─────────────────────────────────────────────────────────────────
  // PLUGIN UI MANIFEST (admin sidebar integration)
  // ─────────────────────────────────────────────────────────────────

  /** GET /api/admin/plugin-ui-manifest — UI contributions from installed plugins */
  async getPluginUiManifest() {
    const res = await apiFetch("/admin/plugin-ui-manifest");
    return res;
  },

  // ─────────────────────────────────────────────────────────────────
  // PLUGIN CONFIG (admin settings)
  // ─────────────────────────────────────────────────────────────────

  /** GET /api/admin/plugins/:name/config — masked config for a plugin */
  async getPluginConfig(name) {
    const res = await apiFetch(`/admin/plugins/${encodeURIComponent(name)}/config`);
    return res.data ?? {};
  },

  /** PATCH /api/admin/plugins/:name/config — merge updates into plugin config */
  async updatePluginConfig(name, config) {
    return apiFetch(`/admin/plugins/${encodeURIComponent(name)}/config`, {
      method: "PATCH",
      body: JSON.stringify(config),
    });
  },

  // ─────────────────────────────────────────────────────────────────
  // INSTALLATION (admin/superadmin)
  // ─────────────────────────────────────────────────────────────────

  /** POST /api/plugins/install/:slug/enqueue — async install, returns jobId */
  async enqueueInstall(slug) {
    const res = await apiFetch(`/plugins/install/${slug}/enqueue`, { method: "POST" });
    return res.data ?? {};
  },

  /** GET /api/plugins/jobs/:jobId — poll job status */
  async getJobStatus(jobId) {
    const res = await apiFetch(`/plugins/jobs/${jobId}`);
    return res.data ?? {};
  },

  /** GET /api/plugins/check-update/:slug */
  async checkForUpdates(slug) {
    const res = await apiFetch(`/plugins/check-update/${slug}`);
    return res.data ?? {};
  },

  /** POST /api/plugins/update/:slug */
  async updatePlugin(slug) {
    const res = await apiFetch(`/plugins/update/${slug}`, { method: "POST" });
    return res;
  },

  // ─────────────────────────────────────────────────────────────────
  // INSTALLED PLUGINS (admin)
  // ─────────────────────────────────────────────────────────────────

  /** GET /api/admin/installed-plugins */
  async listInstalledPlugins() {
    const res = await apiFetch("/admin/installed-plugins");
    return res.data ?? [];
  },

  /** POST /api/admin/installed-plugins/:name/enable */
  async enablePlugin(name) {
    return apiFetch(`/admin/installed-plugins/${encodeURIComponent(name)}/enable`, { method: "POST" });
  },

  /** POST /api/admin/installed-plugins/:name/disable */
  async disablePlugin(name) {
    return apiFetch(`/admin/installed-plugins/${encodeURIComponent(name)}/disable`, { method: "POST" });
  },

  // ─────────────────────────────────────────────────────────────────
  // ADMIN REVIEW — all submissions (admin + superadmin)
  // ─────────────────────────────────────────────────────────────────

  /** GET /api/admin/plugins — all marketplace plugins regardless of status */
  async listAllPlugins() {
    const res = await apiFetch("/admin/plugins");
    return res.data ?? [];
  },

  /** POST /api/admin/plugins/:id/approve */
  async approvePlugin(id, notes = "") {
    return apiFetch(`/admin/plugins/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ approval_notes: notes }),
    });
  },

  /** POST /api/admin/plugins/:id/reject */
  async rejectPlugin(id, reason = "") {
    return apiFetch(`/admin/plugins/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reject_reason: reason }),
    });
  },

  // ─────────────────────────────────────────────────────────────────
  // REVIEWS (admin)
  // ─────────────────────────────────────────────────────────────────

  /** GET /api/admin/marketplace/reviews */
  async listReviews({ productId, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (productId) params.set("productId", productId);
    const res = await apiFetch(`/admin/marketplace/reviews?${params}`);
    return res.data ?? [];
  },

  /** DELETE /api/admin/marketplace/reviews/:id */
  async deleteReview(id) {
    return apiFetch(`/admin/marketplace/reviews/${id}`, { method: "DELETE" });
  },

  /** POST /api/marketplace/plugins/:slug/rate */
  async submitRating(slug, rating) {
    return apiFetch(`/marketplace/plugins/${slug}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating }),
    });
  },

  // ─────────────────────────────────────────────────────────────────
  // PURCHASE (authenticated user)
  // ─────────────────────────────────────────────────────────────────

  /** POST /api/marketplace/plugins/:id/purchase */
  async purchasePlugin(id) {
    return apiFetch(`/marketplace/plugins/${id}/purchase`, { method: "POST" });
  },

  // ─────────────────────────────────────────────────────────────────
  // DEVELOPER — plugin management
  // ─────────────────────────────────────────────────────────────────

  /** GET /api/developer/plugins — developer's own plugins */
  async listDeveloperPlugins() {
    const res = await apiFetch("/developer/plugins");
    return res.data ?? [];
  },

  /** GET /api/developer/plugins/:id */
  async getDeveloperPlugin(id) {
    const res = await apiFetch(`/developer/plugins/${id}`);
    return res.data ?? null;
  },

  /** POST /api/developer/plugins — create new plugin draft */
  async createPlugin(data) {
    return apiFetch("/developer/plugins", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** PATCH /api/developer/plugins/:id */
  async updateDeveloperPlugin(id, data) {
    return apiFetch(`/developer/plugins/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /** POST /api/developer/plugins/:id/version */
  async submitPluginVersion(id, { version, changelog, downloadUrl, checksum }) {
    return apiFetch(`/developer/plugins/${id}/version`, {
      method: "POST",
      body: JSON.stringify({ version, changelog, download_url: downloadUrl, checksum }),
    });
  },

  /** POST /api/developer/plugins/:id/upload-zip (multipart) */
  async uploadPluginZip(id, file, version, changelog = "") {
    const form = new FormData();
    form.append("plugin", file);
    form.append("version", version);
    if (changelog) form.append("changelog", changelog);
    return apiFetch(`/developer/plugins/${id}/upload-zip`, {
      method: "POST",
      body: form,
      headers: { "Content-Type": undefined },
    });
  },

  /** POST /api/developer/plugins/:id/icon (multipart) */
  async uploadPluginIcon(id, file) {
    const form = new FormData();
    form.append("icon", file);
    return apiFetch(`/developer/plugins/${id}/icon`, {
      method: "POST",
      body: form,
      headers: { "Content-Type": undefined },
    });
  },

  /** POST /api/developer/plugins/:id/screenshots (multipart) */
  async uploadPluginScreenshots(id, files) {
    const form = new FormData();
    files.forEach(f => form.append("screenshots", f));
    return apiFetch(`/developer/plugins/${id}/screenshots`, {
      method: "POST",
      body: form,
      headers: { "Content-Type": undefined },
    });
  },

  /** PATCH /api/developer/plugins/:id/pricing */
  async updatePluginPricing(id, { pricingType, price, currency = "USD", interval }) {
    return apiFetch(`/developer/plugins/${id}/pricing`, {
      method: "PATCH",
      body: JSON.stringify({ pricingType, price, currency, interval }),
    });
  },

  /** GET /api/developer/plugins/:id/analytics */
  async getDeveloperAnalytics(id) {
    const res = await apiFetch(`/developer/plugins/${id}/analytics`);
    return res.data ?? {};
  },

  // ─────────────────────────────────────────────────────────────────
  // DEVELOPER — profile
  // ─────────────────────────────────────────────────────────────────

  /** GET /api/developer/profile */
  async getDeveloperProfile() {
    const res = await apiFetch("/developer/profile");
    return res.data ?? {};
  },

  /** PATCH /api/developer/profile */
  async updateDeveloperProfile(data) {
    return apiFetch("/developer/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

export default MarketplaceAPI;
