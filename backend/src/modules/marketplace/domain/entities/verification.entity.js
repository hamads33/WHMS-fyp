// src/modules/marketplace/domain/entities/verification.entity.js
class MarketplaceVerification {
  constructor({ id, submissionId, productId, versionId = null, passed = false, report = null, createdAt = new Date() }) {
    this.id = id;
    this.submissionId = submissionId;
    this.productId = productId;
    this.versionId = versionId;
    this.passed = passed;
    this.report = report;
    this.createdAt = createdAt;
  }
}

module.exports = MarketplaceVerification;
