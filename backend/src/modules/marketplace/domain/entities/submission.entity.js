// src/modules/marketplace/domain/entities/submission.entity.js
class MarketplaceSubmission {
  constructor({ id, productId, versionId = null, submitterId, status = 'pending', notes = null, createdAt = new Date(), updatedAt = new Date() }) {
    this.id = id;
    this.productId = productId;
    this.versionId = versionId;
    this.submitterId = submitterId;
    this.status = status;
    this.notes = notes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  setStatus(status, notes = null) {
    this.status = status;
    if (notes !== null) this.notes = notes;
    this.updatedAt = new Date();
  }
}

module.exports = MarketplaceSubmission;
