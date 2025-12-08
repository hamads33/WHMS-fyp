// src/modules/marketplace/domain/entities/review.entity.js
class MarketplaceReview {
  constructor({ id, productId, userId, rating, stability = null, review = null, createdAt = new Date() }) {
    this.id = id;
    this.productId = productId;
    this.userId = userId;
    this.rating = rating;
    this.stability = stability;
    this.review = review;
    this.createdAt = createdAt;
  }
}

module.exports = MarketplaceReview;
