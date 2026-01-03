// src/modules/marketplace/utils/rating.calculator.js
// Rating aggregation and calculation utilities

class RatingCalculator {
  /**
   * Calculate average rating
   */
  static calculateAverage(ratings) {
    if (!ratings || ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r, 0);
    return parseFloat((sum / ratings.length).toFixed(2));
  }

  /**
   * Calculate rating distribution
   */
  static getDistribution(ratings) {
    const distribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };

    for (const rating of ratings) {
      distribution[Math.floor(rating)]++;
    }

    return distribution;
  }

  /**
   * Get rating stats
   */
  static getStats(ratings) {
    if (!ratings || ratings.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        median: 0
      };
    }

    const sorted = [...ratings].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;

    return {
      average: this.calculateAverage(ratings),
      total: ratings.length,
      distribution: this.getDistribution(ratings),
      median: parseFloat(median.toFixed(2))
    };
  }
}

module.exports = RatingCalculator;
