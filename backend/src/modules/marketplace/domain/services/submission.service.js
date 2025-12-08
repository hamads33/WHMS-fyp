// src/modules/marketplace/domain/services/submission.service.js
const MarketplaceSubmission = require('../entities/submission.entity');
const { v4: uuidv4 } = require('uuid');

class SubmissionDomainService {
  constructor({ submissionRepository, productRepository, rules, eventBus }) {
    this.submissionRepository = submissionRepository;
    this.productRepository = productRepository;
    this.rules = rules;
    this.eventBus = eventBus;
  }

  async submit({ submitterId, productId, versionId, manifestJson }) {
    const product = await this.productRepository.findById(productId);
    if (!product) throw new Error('Product not found');
    const ok = await this.rules.canSubmit({ submitterId, product, rolesChecker: async (id)=>[] });
    if (!ok) throw new Error('Not authorized to submit for this product');

    // manifest basic validation
    this.rules.validateManifest(manifestJson);

    const id = uuidv4();
    const submission = new MarketplaceSubmission({ id, productId, versionId, submitterId, status: 'pending' });
    const created = await this.submissionRepository.save(submission);

    this.eventBus?.publish?.('marketplace.submission.created', { submission: created });
    return created;
  }

  async setStatus(submissionId, status, notes = null) {
    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission) throw new Error('Submission not found');
    submission.setStatus(status, notes);
    const saved = await this.submissionRepository.save(submission);
    return saved;
  }
}

module.exports = SubmissionDomainService;
