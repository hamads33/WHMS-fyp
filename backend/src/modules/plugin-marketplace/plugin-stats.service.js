/**
 * plugin-stats.service.js
 * ------------------------------------------------------------------
 * In-memory stats tracking for marketplace plugins.
 *
 * Stats tracked per plugin:
 *   install_count        — total installations ever
 *   active_install_count — current active installs (decremented on uninstall)
 *   average_rating       — rolling average from submitted ratings
 *   review_count         — number of ratings submitted
 *   last_installed_at    — ISO timestamp of most recent install
 *   last_updated_at      — ISO timestamp of last any-stat change
 */

class PluginStatsService {
  constructor() {
    // Map<pluginId, StatsRecord>
    this._stats = new Map();
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  /** Returns the stats record for pluginId, creating it if missing. */
  _get(pluginId) {
    if (!this._stats.has(pluginId)) {
      this._stats.set(pluginId, {
        plugin_id           : pluginId,
        install_count       : 0,
        active_install_count: 0,
        average_rating      : 0,
        review_count        : 0,
        last_installed_at   : null,
        last_updated_at     : null,
        total_revenue       : 0,
        sales_count         : 0,
        // internal — used to recompute rolling average without storing all ratings
        _rating_sum         : 0,
      });
    }
    return this._stats.get(pluginId);
  }

  _touch(record) {
    record.last_updated_at = new Date().toISOString();
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * recordInstall
   * Called when a plugin is successfully installed.
   *
   * @param {string} pluginId
   */
  recordInstall(pluginId) {
    const s = this._get(pluginId);
    s.install_count        += 1;
    s.active_install_count += 1;
    s.last_installed_at     = new Date().toISOString();
    this._touch(s);
  }

  /**
   * recordUninstall
   * Called when a plugin is uninstalled.
   * active_install_count will not go below 0.
   *
   * @param {string} pluginId
   */
  recordUninstall(pluginId) {
    const s = this._get(pluginId);
    s.active_install_count = Math.max(0, s.active_install_count - 1);
    this._touch(s);
  }

  /**
   * recordRating
   * Adds a rating (1–5) and recomputes the rolling average.
   *
   * @param {string} pluginId
   * @param {number} rating   — expected 1–5
   */
  recordRating(pluginId, rating) {
    const clamped = Math.min(5, Math.max(1, Number(rating)));
    const s = this._get(pluginId);
    s._rating_sum    += clamped;
    s.review_count   += 1;
    s.average_rating  = parseFloat((s._rating_sum / s.review_count).toFixed(2));
    this._touch(s);
  }

  /**
   * recordSale
   * Records a sale (purchase) for a plugin.
   *
   * @param {string} pluginId
   * @param {number} amountCents — price in cents
   */
  recordSale(pluginId, amountCents) {
    const s = this._get(pluginId);
    s.total_revenue += amountCents / 100; // Convert to dollars
    s.sales_count   += 1;
    this._touch(s);
  }

  /**
   * getPluginStats
   * Returns the public stats object for a plugin (omits internal _rating_sum).
   *
   * @param  {string} pluginId
   * @returns {{ plugin_id, install_count, active_install_count, average_rating, review_count, last_installed_at, last_updated_at }}
   */
  getPluginStats(pluginId) {
    const s = this._get(pluginId);
    const { _rating_sum, ...pub } = s;
    return pub;
  }

  /**
   * getTopPlugins
   * Returns plugins ranked by a composite score:
   *   score = (active_install_count * 0.5) + (average_rating * 10 * 0.3) + (install_count * 0.2)
   * Useful for a "featured / top" listing.
   *
   * @param  {number} [limit=10]
   * @returns {Array}
   */
  getTopPlugins(limit = 10) {
    return [...this._stats.values()]
      .map(s => ({
        ...this.getPluginStats(s.plugin_id),
        _score: s.active_install_count * 0.5 + s.average_rating * 10 * 0.3 + s.install_count * 0.2,
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...s }) => s);
  }

  /**
   * getMostInstalledPlugins
   * Sorted by install_count descending.
   *
   * @param  {number} [limit=10]
   * @returns {Array}
   */
  getMostInstalledPlugins(limit = 10) {
    return [...this._stats.values()]
      .map(s => this.getPluginStats(s.plugin_id))
      .sort((a, b) => b.install_count - a.install_count)
      .slice(0, limit);
  }

  /**
   * getHighestRatedPlugins
   * Sorted by average_rating descending. Plugins with no reviews are excluded.
   *
   * @param  {number} [limit=10]
   * @returns {Array}
   */
  getHighestRatedPlugins(limit = 10) {
    return [...this._stats.values()]
      .filter(s => s.review_count > 0)
      .map(s => this.getPluginStats(s.plugin_id))
      .sort((a, b) => b.average_rating - a.average_rating || b.review_count - a.review_count)
      .slice(0, limit);
  }

  /**
   * getAllStats
   * Returns raw stats for every tracked plugin (admin/debug use).
   *
   * @returns {Array}
   */
  getAllStats() {
    return [...this._stats.values()].map(s => this.getPluginStats(s.plugin_id));
  }
}

// Export a singleton so all modules share the same in-memory store
module.exports = new PluginStatsService();
