// src/modules/marketplace/domain/services/verification.service.js
const MarketplaceVerification = require('../entities/verification.entity');
const { v4: uuidv4 } = require('uuid');

class VerificationDomainService {
  constructor({ verificationRepository, submissionRepository, productRepository, eventBus }) {
    this.verificationRepository = verificationRepository;
    this.submissionRepository = submissionRepository;
    this.productRepository = productRepository;
    this.eventBus = eventBus;
  }

  async createResult({ submissionId, productId, versionId, passed, report }) {
    const id = uuidv4();
    const verification = new MarketplaceVerification({ id, submissionId, productId, versionId, passed, report });
    const created = await this.verificationRepository.save(verification);

    // update submission status
    if (submissionId) {
      const submission = await this.submissionRepository.findById(submissionId);
      if (submission) {
        submission.setStatus(passed ? 'approved' : 'failed', report?.summary || null);
        await this.submissionRepository.save(submission);
      }
    }

    // update product/version verification flags via event
    this.eventBus?.publish?.('marketplace.verification.completed', { verification: created });
    return created;
  }
}

module.exports = VerificationDomainService;
