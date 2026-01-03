// lib/api/marketplace.js
/**
 * Marketplace API Client
 * Handles all plugin marketplace operations
 * ✓ Browse plugins
 * ✓ Search & filter
 * ✓ Plugin details
 * ✓ Ratings & reviews
 * ✓ Install/manage
 */

import { apiFetch } from "./client";

export const MarketplaceAPI = {
  // ===================================
  // BROWSE & SEARCH
  // ===================================

  /**
   * Get all plugins with pagination and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {string} params.search - Search query
   * @param {string} params.category - Filter by category
   * @param {string} params.sortBy - Sort by: popular, rating, newest, price
   * @param {string} params.priceMin - Minimum price
   * @param {string} params.priceMax - Maximum price
   * @param {string} params.rating - Minimum rating (0-5)
   * @param {string} params.status - Filter by status: verified, featured, new
   */
  async getPlugins(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(`/marketplace/plugins${query ? `?${query}` : ""}`);
  },

  /**
   * Search plugins with query
   * @param {string} query - Search term
   * @param {Object} params - Additional filter parameters
   */
  async searchPlugins(query, params = {}) {
    return await this.getPlugins({
      search: query,
      ...params,
    });
  },

  /**
   * Get featured plugins
   * @param {number} limit - Number of plugins to return (default: 10)
   */
  async getFeaturedPlugins(limit = 10) {
    return await apiFetch(`/marketplace/plugins/featured?limit=${limit}`);
  },

  /**
   * Get trending plugins
   * @param {number} limit - Number of plugins to return (default: 10)
   */
  async getTrendingPlugins(limit = 10) {
    return await apiFetch(`/marketplace/plugins/trending?limit=${limit}`);
  },

  // ===================================
  // PLUGIN DETAILS
  // ===================================

  /**
   * Get complete plugin details
   * @param {string} pluginId - Plugin ID
   */
  async getPlugin(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}`);
  },

  /**
   * Get plugin by slug
   * @param {string} slug - Plugin slug
   */
  async getPluginBySlug(slug) {
    return await apiFetch(`/marketplace/plugins/slug/${slug}`);
  },

  /**
   * Get plugin metadata
   * @param {string} pluginId - Plugin ID
   */
  async getPluginMetadata(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/metadata`);
  },

  /**
   * Get plugin changelog
   * @param {string} pluginId - Plugin ID
   */
  async getPluginChangelog(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/changelog`);
  },

  /**
   * Get similar/related plugins
   * @param {string} pluginId - Plugin ID
   * @param {number} limit - Number of related plugins
   */
  async getRelatedPlugins(pluginId, limit = 5) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/related?limit=${limit}`);
  },

  // ===================================
  // RATINGS & REVIEWS
  // ===================================

  /**
   * Get plugin reviews
   * @param {string} pluginId - Plugin ID
   * @param {Object} params - Pagination and filter params
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.sortBy - Sort: newest, helpful, rating
   * @param {number} params.rating - Filter by rating
   */
  async getPluginReviews(pluginId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/marketplace/plugins/${pluginId}/reviews${query ? `?${query}` : ""}`
    );
  },

  /**
   * Get user's review for a plugin
   * @param {string} pluginId - Plugin ID
   */
  async getUserReview(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/reviews/me`);
  },

  /**
   * Submit or update a review
   * @param {string} pluginId - Plugin ID
   * @param {Object} reviewData - Review data
   * @param {number} reviewData.rating - Rating (1-5)
   * @param {string} reviewData.title - Review title
   * @param {string} reviewData.content - Review content
   */
  async submitReview(pluginId, reviewData) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/reviews`, {
      method: "POST",
      body: JSON.stringify(reviewData),
    });
  },

  /**
   * Update an existing review
   * @param {string} pluginId - Plugin ID
   * @param {string} reviewId - Review ID
   * @param {Object} reviewData - Updated review data
   */
  async updateReview(pluginId, reviewId, reviewData) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/reviews/${reviewId}`, {
      method: "PUT",
      body: JSON.stringify(reviewData),
    });
  },

  /**
   * Delete a review
   * @param {string} pluginId - Plugin ID
   * @param {string} reviewId - Review ID
   */
  async deleteReview(pluginId, reviewId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/reviews/${reviewId}`, {
      method: "DELETE",
    });
  },

  /**
   * Mark review as helpful
   * @param {string} pluginId - Plugin ID
   * @param {string} reviewId - Review ID
   */
  async markReviewHelpful(pluginId, reviewId) {
    return await apiFetch(
      `/marketplace/plugins/${pluginId}/reviews/${reviewId}/helpful`,
      {
        method: "POST",
      }
    );
  },

  /**
   * Get plugin ratings summary
   * @param {string} pluginId - Plugin ID
   */
  async getPluginRatings(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/ratings`);
  },

  // ===================================
  // INSTALLATION & MANAGEMENT
  // ===================================

  /**
   * Install a plugin
   * @param {string} pluginId - Plugin ID
   * @param {Object} config - Installation configuration
   */
  async installPlugin(pluginId, config = {}) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/install`, {
      method: "POST",
      body: JSON.stringify(config),
    });
  },

  /**
   * Uninstall a plugin
   * @param {string} pluginId - Plugin ID
   */
  async uninstallPlugin(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/uninstall`, {
      method: "DELETE",
    });
  },

  /**
   * Get installed plugins
   * @param {Object} params - Filter params
   * @param {string} params.status - Filter by status
   * @param {string} params.sortBy - Sort by
   */
  async getInstalledPlugins(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(`/marketplace/installed${query ? `?${query}` : ""}`);
  },

  /**
   * Get installation status of a plugin
   * @param {string} pluginId - Plugin ID
   */
  async getInstallationStatus(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/installation-status`);
  },

  /**
   * Update plugin configuration
   * @param {string} pluginId - Plugin ID
   * @param {Object} config - New configuration
   */
  async updatePluginConfig(pluginId, config) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/config`, {
      method: "PUT",
      body: JSON.stringify(config),
    });
  },

  /**
   * Enable/disable a plugin
   * @param {string} pluginId - Plugin ID
   * @param {boolean} enabled - Enable or disable
   */
  async togglePlugin(pluginId, enabled) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/toggle`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
  },

  /**
   * Get plugin update availability
   * @param {string} pluginId - Plugin ID
   */
  async checkPluginUpdate(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/update-check`);
  },

  /**
   * Update a plugin to latest version
   * @param {string} pluginId - Plugin ID
   */
  async updatePlugin(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/update`, {
      method: "POST",
    });
  },

  // ===================================
  // FAVORITES & COLLECTIONS
  // ===================================

  /**
   * Add plugin to favorites
   * @param {string} pluginId - Plugin ID
   */
  async addToFavorites(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/favorite`, {
      method: "POST",
    });
  },

  /**
   * Remove plugin from favorites
   * @param {string} pluginId - Plugin ID
   */
  async removeFromFavorites(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/favorite`, {
      method: "DELETE",
    });
  },

  /**
   * Get user's favorite plugins
   * @param {Object} params - Pagination params
   */
  async getFavorites(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(`/marketplace/favorites${query ? `?${query}` : ""}`);
  },

  /**
   * Create a collection
   * @param {Object} collectionData - Collection data
   * @param {string} collectionData.name - Collection name
   * @param {string} collectionData.description - Collection description
   * @param {string[]} collectionData.pluginIds - Array of plugin IDs
   */
  async createCollection(collectionData) {
    return await apiFetch("/marketplace/collections", {
      method: "POST",
      body: JSON.stringify(collectionData),
    });
  },

  /**
   * Get user's collections
   */
  async getCollections() {
    return await apiFetch("/marketplace/collections");
  },

  /**
   * Get collection details
   * @param {string} collectionId - Collection ID
   */
  async getCollection(collectionId) {
    return await apiFetch(`/marketplace/collections/${collectionId}`);
  },

  /**
   * Update collection
   * @param {string} collectionId - Collection ID
   * @param {Object} collectionData - Updated collection data
   */
  async updateCollection(collectionId, collectionData) {
    return await apiFetch(`/marketplace/collections/${collectionId}`, {
      method: "PUT",
      body: JSON.stringify(collectionData),
    });
  },

  /**
   * Delete collection
   * @param {string} collectionId - Collection ID
   */
  async deleteCollection(collectionId) {
    return await apiFetch(`/marketplace/collections/${collectionId}`, {
      method: "DELETE",
    });
  },

  /**
   * Add plugin to collection
   * @param {string} collectionId - Collection ID
   * @param {string} pluginId - Plugin ID
   */
  async addToCollection(collectionId, pluginId) {
    return await apiFetch(`/marketplace/collections/${collectionId}/plugins/${pluginId}`, {
      method: "POST",
    });
  },

  /**
   * Remove plugin from collection
   * @param {string} collectionId - Collection ID
   * @param {string} pluginId - Plugin ID
   */
  async removeFromCollection(collectionId, pluginId) {
    return await apiFetch(`/marketplace/collections/${collectionId}/plugins/${pluginId}`, {
      method: "DELETE",
    });
  },

  // ===================================
  // CATEGORIES & TAGS
  // ===================================

  /**
   * Get all plugin categories
   */
  async getCategories() {
    return await apiFetch("/marketplace/categories");
  },

  /**
   * Get category with plugins
   * @param {string} categoryId - Category ID
   * @param {Object} params - Pagination params
   */
  async getCategory(categoryId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/marketplace/categories/${categoryId}${query ? `?${query}` : ""}`
    );
  },

  /**
   * Get all plugin tags
   */
  async getTags() {
    return await apiFetch("/marketplace/tags");
  },

  /**
   * Get plugins by tag
   * @param {string} tagId - Tag ID
   * @param {Object} params - Pagination params
   */
  async getPluginsByTag(tagId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(`/marketplace/tags/${tagId}${query ? `?${query}` : ""}`);
  },

  // ===================================
  // STATISTICS & ANALYTICS
  // ===================================

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats() {
    return await apiFetch("/marketplace/stats");
  },

  /**
   * Get plugin statistics
   * @param {string} pluginId - Plugin ID
   */
  async getPluginStats(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/stats`);
  },

  /**
   * Track plugin view
   * @param {string} pluginId - Plugin ID
   */
  async trackPluginView(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/track-view`, {
      method: "POST",
    });
  },

  /**
   * Track plugin install
   * @param {string} pluginId - Plugin ID
   */
  async trackPluginInstall(pluginId) {
    return await apiFetch(`/marketplace/plugins/${pluginId}/track-install`, {
      method: "POST",
    });
  },

  // ===================================
  // RECOMMENDATIONS
  // ===================================

  /**
   * Get recommended plugins for user
   * @param {Object} params - Filter params
   */
  async getRecommendedPlugins(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiFetch(
      `/marketplace/plugins/recommendations${query ? `?${query}` : ""}`
    );
  },

  /**
   * Get plugins recommended by category
   * @param {string} category - Category name
   */
  async getRecommendationsByCategory(category) {
    return await apiFetch(`/marketplace/plugins/recommendations/category/${category}`);
  },
};

export default MarketplaceAPI;