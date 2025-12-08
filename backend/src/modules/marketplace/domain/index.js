// src/modules/marketplace/domain/index.js
module.exports = {
  entities: {
    MarketplaceProduct: require('./entities/product.entity'),
    MarketplaceVersion: require('./entities/version.entity'),
    MarketplaceSubmission: require('./entities/submission.entity'),
    MarketplaceVerification: require('./entities/verification.entity'),
    MarketplacePurchase: require('./entities/purchase.entity'),
    MarketplaceReview: require('./entities/review.entity'),
    MarketplaceAnalyticsEvent: require('./entities/analytics.entity'),
  },
  vo: {
    Price: require('./value-objects/price.vo'),
    ProductStatus: require('./value-objects/status.vo'),
  },
  services: {
    ProductDomainService: require('./services/product.service'),
    SubmissionDomainService: require('./services/submission.service'),
    VerificationDomainService: require('./services/verification.service'),
    LicensingDomainService: require('./services/licensing.service'),
  },
  rules: require('./rules/submission.rules'),
  events: require('./events'),
  repositories: {
    ProductRepository: require('./repository/product.repository'),
    VersionRepository: require('./repository/version.repository'),
    SubmissionRepository: require('./repository/submission.repository'),
    VerificationRepository: require('./repository/verification.repository'),
  }
};
