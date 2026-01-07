// lib/api/marketplace.js
/**
 * Marketplace API Client
 * Handles all plugin marketplace operations
 * ✓ Browse plugins
 * ✓ Search & filter
 * ✓ Plugin details
 * ✓ Ratings & reviews
 * ✓ Install/manage
 * ✓ Developer submissions
 * ✓ Admin operations
 */

import { apiFetch } from "./client";

export const MarketplaceAPI = {
  // ===================================
  // PUBLIC: BROWSE & SEARCH
  // ===================================

  /**
   * Get all plugins with pagination and filters
   * GET /api/marketplace/plugins
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {string} params.search - Search query
   * @param {string} params.category - Filter by category
   * @param {string} params.sort - Sort by: downloads, rating, newest
   * @param {number} params.minRating - Minimum rating filter
   */
  async browsePlugins(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(`/marketplace/plugins${query ? `?${query}` : ""}`);
  },

  /**
   * Search plugins
   * GET /api/marketplace/search
   * @param {string} q - Search query
   * @param {Object} params - Additional filter parameters
   */
  async searchPlugins(q, params = {}) {
    return await apiFetch(`/marketplace/search?q=${encodeURIComponent(q)}&${new URLSearchParams(params).toString()}`);
  },

  // ===================================
  // PUBLIC: PLUGIN DETAILS
  // ===================================

  /**
   * Get complete plugin details
   * GET /api/marketplace/plugins/:id
   * @param {string} pluginId - Plugin ID
   */
  async getPluginDetails(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}`);
  },

  /**
   * Get plugin dependencies
   * GET /api/marketplace/plugins/:id/dependencies
   * @param {string} pluginId - Plugin ID
   */
  async getPluginDependencies(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/dependencies`);
  },

  // ===================================
  // PUBLIC: RATINGS & REVIEWS
  // ===================================

  /**
   * Get plugin reviews with pagination
   * GET /api/marketplace/plugins/:id/reviews
   * @param {string} pluginId - Plugin ID
   * @param {Object} params - Pagination params
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 10)
   */
  async getPluginReviews(pluginId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/marketplace/plugins/${pluginId}/reviews${query ? `?${query}` : ""}`
    );
  },

  /**
   * Submit a review
   * POST /api/marketplace/plugins/:id/reviews
   * @param {string} pluginId - Plugin ID
   * @param {Object} reviewData - Review data
   * @param {number} reviewData.rating - Rating (1-5)
   * @param {string} reviewData.text - Review text
   */
  async submitReview(pluginId, reviewData) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/reviews`, {
      method: "POST",
      body: JSON.stringify(reviewData),
    });
  },

  /**
   * Mark a review as helpful
   * POST /api/marketplace/plugins/:id/reviews/:reviewId/helpful
   * @param {string} pluginId - Plugin ID
   * @param {string} reviewId - Review ID
   */
  async markReviewHelpful(pluginId, reviewId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/reviews/${reviewId}/helpful`, {
      method: "POST",
    });
  },

  // ===================================
  // PUBLIC: CATEGORIES & LICENSING
  // ===================================

  /**
   * Get all plugin categories
   * GET /api/marketplace/categories
   */
  async getCategories() {
    return await apiFetch("/marketplace/categories");
  },

  /**
   * Get plugin licensing requirements
   * GET /api/marketplace/plugins/:id/license
   * @param {string} pluginId - Plugin ID
   */
  async getPluginLicense(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/license`);
  },

  /**
   * Get plugin statistics (public)
   * GET /api/marketplace/plugins/:id/stats
   * @param {string} pluginId - Plugin ID
   */
  async getPluginStats(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/stats`);
  },

  /**
   * Get related plugins
   * GET /api/marketplace/plugins/:id/related
   * @param {string} pluginId - Plugin ID
   * @param {number} limit - Number of related plugins to return
   */
  async getRelatedPlugins(pluginId, limit = 3) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/related?limit=${limit}`);
  },

  // ===================================
  // DEVELOPER: SUBMISSION & MANAGEMENT
  // ===================================

  /**
   * Submit new plugin
   * POST /api/marketplace/developer/submit
   * @param {FormData} formData - Multipart form data with archive, manifest, metadata
   * @param {File} formData.archive - Plugin ZIP archive
   * @param {string} formData.name - Plugin name
   * @param {string} formData.slug - Plugin slug
   * @param {string} formData.description - Plugin description
   * @param {string} formData.category - Category ID
   * @param {string} formData.icon - Icon URL
   * @param {string} formData.tags - Comma-separated tags
   * @param {string} formData.version - Version number
   * @param {string} formData.changelog - Changelog text
   * @param {string} formData.manifest - Manifest JSON string
   * @param {string} formData.licenseType - License type
   */
  async submitPlugin(formData) {
    return await apiFetch("/marketplace/developer/submit", {
      method: "POST",
      body: formData, // Don't stringify FormData
    });
  },

  /**
   * List developer's products
   * GET /api/marketplace/developer/products
   */
  async getDeveloperProducts() {
    return await apiFetch("/marketplace/developer/products");
  },

  /**
   * Get specific product details
   * GET /api/marketplace/developer/products/:id
   * @param {string} productId - Product ID
   */
  async getDeveloperProduct(productId) {
    return await apiFetch(`/marketplace/developer/products/${productId}`);
  },

  /**
   * Update product metadata
   * PATCH /api/marketplace/developer/products/:id
   * @param {string} productId - Product ID
   * @param {Object} updateData - Update data
   * @param {string} updateData.description - Updated description
   * @param {string} updateData.category - Updated category
   * @param {string} updateData.icon - Updated icon URL
   * @param {string[]} updateData.tags - Updated tags
   */
  async updateDeveloperProduct(productId, updateData) {
    return await apiFetch(`/marketplace/developer/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });
  },

  /**
   * Get developer submissions history
   * GET /api/marketplace/developer/submissions
   */
  async getDeveloperSubmissions() {
    return await apiFetch("/marketplace/developer/submissions");
  },

  /**
   * Get submission details with verification results
   * GET /api/marketplace/developer/submissions/:id
   * @param {string} submissionId - Submission ID
   */
  async getDeveloperSubmission(submissionId) {
    return await apiFetch(`/marketplace/developer/submissions/${submissionId}`);
  },

  /**
   * Get developer analytics for all products
   * GET /api/marketplace/developer/analytics
   * @param {Object} params - Query params
   * @param {number} params.days - Time period in days (default: 30)
   */
  async getDeveloperAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/marketplace/developer/analytics${query ? `?${query}` : ""}`
    );
  },

  /**
   * Get analytics for specific product
   * GET /api/marketplace/developer/analytics/:productId
   * @param {string} productId - Product ID
   * @param {Object} params - Query params
   * @param {number} params.days - Time period in days (default: 30)
   */
  async getProductAnalytics(productId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/marketplace/developer/analytics/${productId}${query ? `?${query}` : ""}`
    );
  },

  // ===================================
  // ADMIN: DASHBOARD & STATS
  // ===================================

  /**
   * Get admin dashboard statistics
   * GET /api/marketplace/admin/dashboard
   */
  async getAdminDashboard() {
    return await apiFetch("/marketplace/admin/dashboard");
  },

  // ===================================
  // ADMIN: SUBMISSIONS REVIEW
  // ===================================

  /**
   * Get pending submissions for review
   * GET /api/marketplace/admin/submissions
   * @param {Object} params - Query params
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Filter by status
   */
  async getAdminSubmissions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/marketplace/admin/submissions${query ? `?${query}` : ""}`
    );
  },

  /**
   * Get submission details for admin review
   * GET /api/marketplace/admin/submissions/:id
   * @param {string} submissionId - Submission ID
   */
  async getAdminSubmission(submissionId) {
    return await apiFetch(`/marketplace/admin/submissions/${submissionId}`);
  },

  /**
   * Review and approve/reject submission
   * POST /api/marketplace/admin/submissions/:id/review
   * @param {string} submissionId - Submission ID
   * @param {Object} reviewData - Review data
   * @param {string} reviewData.action - "approve" or "reject"
   * @param {string} reviewData.notes - Optional rejection reason
   */
  async reviewSubmission(submissionId, reviewData) {
    return await apiFetch(`/marketplace/admin/submissions/${submissionId}/review`, {
      method: "POST",
      body: JSON.stringify(reviewData),
    });
  },

  // ===================================
  // ADMIN: PRODUCT MANAGEMENT
  // ===================================

  /**
   * Get all marketplace products (admin)
   * GET /api/marketplace/admin/products
   * @param {Object} params - Query params
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Filter by status
   * @param {string} params.categoryId - Filter by category
   */
  async getAdminProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/marketplace/admin/products${query ? `?${query}` : ""}`
    );
  },

  /**
   * Get product details (admin)
   * GET /api/marketplace/admin/products/:id
   * @param {string} productId - Product ID
   */
  async getAdminProduct(productId) {
    return await apiFetch(`/marketplace/admin/products/${productId}`);
  },

  /**
   * Update product (admin)
   * PATCH /api/marketplace/admin/products/:id
   * @param {string} productId - Product ID
   * @param {Object} updateData - Update data
   * @param {string} updateData.status - Status: approved, draft, rejected
   * @param {string} updateData.categoryId - Category ID
   * @param {string[]} updateData.tags - Tags
   * @param {string} updateData.rejectReason - Rejection reason
   */
  async updateAdminProduct(productId, updateData) {
    return await apiFetch(`/marketplace/admin/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });
  },

  // ===================================
  // INSTALLATION (Authenticated)
  // ===================================

  /**
   * Install plugin
   * POST /api/marketplace/install/:productId
   * @param {string} productId - Product ID
   * @param {Object} config - Installation config
   * @param {string} config.versionId - Optional: specific version ID
   */
  async installPlugin(productId, config = {}) {
    return await apiFetch(`/marketplace/install/${productId}`, {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  /**
   * Update plugin to newer version
   * POST /api/marketplace/install/update/:productId
   * @param {string} productId - Product ID
   * @param {Object} config - Update config
   * @param {string} config.versionId - Optional: specific version ID
   */
  async updatePlugin(productId, config = {}) {
    return await apiFetch(`/marketplace/install/update/${productId}`, {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  /**
   * Get list of installed plugins
   * GET /api/marketplace/install/installed
   */
  async getInstalledPlugins() {
    return await apiFetch("/marketplace/install/installed");
  },

  /**
   * Uninstall plugin
   * DELETE /api/marketplace/install/installed/:productId
   * @param {string} productId - Product ID
   */
  async uninstallPlugin(productId) {
    return await apiFetch(`/marketplace/install/installed/${productId}`, {
      method: "DELETE",
    });
  },
};

export default MarketplaceAPI;