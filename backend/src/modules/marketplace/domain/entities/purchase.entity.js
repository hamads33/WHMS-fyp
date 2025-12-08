// src/modules/marketplace/domain/entities/purchase.entity.js
class MarketplacePurchase {
  constructor({ id, userId, productId, versionId, licenseKey, subscribed = false, activationLimit = 1, expiresAt = null, revoked = false, createdAt = new Date() }) {
    this.id = id;
    this.userId = userId;
    this.productId = productId;
    this.versionId = versionId;
    this.licenseKey = licenseKey;
    this.subscribed = subscribed;
    this.activationLimit = activationLimit;
    this.expiresAt = expiresAt;
    this.revoked = revoked;
    this.createdAt = createdAt;
  }

  revoke() {
    this.revoked = true;
  }

  isActive() {
    if (this.revoked) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    return true;
  }
}

module.exports = MarketplacePurchase;
