// ------------------------------------------------------------
// AnalyticsOverviewUseCase
// FR-M9: View plugin analytics (downloads, installs, ratings, etc.)
// ------------------------------------------------------------

class AnalyticsOverviewUseCase {
  constructor(analyticsRepo) {
    this.analyticsRepo = analyticsRepo;
  }

  /**
   * Execute analytics query for a given product
   * @param {string} productId
   * @returns {Promise<Object>}
   */
  async execute(productId) {
    if (!productId) {
      throw new Error("productId is required for analytics overview");
    }

    // fetch aggregated data from repository
    const data = await this.analyticsRepo.getOverview(productId);

    return {
      success: true,
      productId,
      analytics: data,
    };
  }
}

module.exports = AnalyticsOverviewUseCase;
