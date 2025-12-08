// src/modules/marketplace/domain/entities/analytics.entity.js
class MarketplaceAnalyticsEvent {
  constructor({ id, productId, versionId = null, eventType, meta = null, createdAt = new Date() }) {
    this.id = id;
    this.productId = productId;
    this.versionId = versionId;
    this.eventType = eventType;
    this.meta = meta;
    this.createdAt = createdAt;
  }
}

module.exports = MarketplaceAnalyticsEvent;
