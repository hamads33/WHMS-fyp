const SubmissionStore = require('../stores/submissionStore');
const VersionStore = require('../stores/versionStore');
const ProductStore = require('../stores/productStore');
const WebhookEmitter = require('../utils/webhookEmitter');
const AnalyticsService = require('./analytics.service');

const SubmissionService = {

  async listAll() {
    return SubmissionStore.listAll();
  },

  /* --------------------------------------------
   * APPROVE VERSION SUBMISSION
   * ------------------------------------------*/
  async approve(submissionId, adminId) {
    const sub = await SubmissionStore.findById(submissionId);
    if (!sub) throw new Error('Submission not found');

    const version = await VersionStore.findById(sub.versionId);
    if (!version) throw new Error('Version linked to submission not found');

    const product = await ProductStore.findById(sub.productId);
    if (!product) throw new Error('Product not found');

    // Step 1 — Mark version as approved/published
    await SubmissionStore.update(submissionId, {
      status: 'approved',
      reviewerId: adminId
    });

    await ProductStore.update(product.id, {
      status: 'approved',
      approvedAt: new Date()
    });

    // Step 2 — Fire Webhook
    WebhookEmitter.emit(product.sellerId, 'version.approved', {
      productId: product.id,
      versionId: version.id,
      version: version.version
    });

    // Step 3 — Analytics
    AnalyticsService.track({
      productId: product.id,
      versionId: version.id,
      eventType: 'version.approved',
      meta: { adminId }
    }).catch(() => {});

    return {
      message: 'Version approved successfully',
      product,
      version
    };
  },

  /* --------------------------------------------
   * REJECT SUBMISSION
   * ------------------------------------------*/
  async reject(submissionId, adminId, reason) {
    const sub = await SubmissionStore.findById(submissionId);
    if (!sub) throw new Error('Submission not found');

    await SubmissionStore.update(submissionId, {
      status: 'rejected',
      reviewerId: adminId,
      reason
    });

    const product = await ProductStore.findById(sub.productId);

    WebhookEmitter.emit(product.sellerId, 'version.rejected', {
      productId: sub.productId,
      versionId: sub.versionId,
      reason
    });

    return { message: 'Submission rejected', reason };
  },

  /* --------------------------------------------
   * APPROVE ENTIRE PRODUCT (initial publish)
   * ------------------------------------------*/
  async approveProduct(productId, adminId) {
    const product = await ProductStore.findById(productId);
    if (!product) throw new Error('Product not found');

    await ProductStore.update(productId, {
      status: 'approved',
      approvedAt: new Date()
    });

    WebhookEmitter.emit(product.sellerId, 'product.approved', {
      productId,
      adminId
    });

    return { message: 'Product approved', product };
  },

  /* --------------------------------------------
   * REJECT PRODUCT
   * ------------------------------------------*/
  async rejectProduct(productId, adminId, reason) {
    const product = await ProductStore.findById(productId);
    if (!product) throw new Error('Product not found');

    await ProductStore.update(productId, {
      status: 'rejected'
    });

    WebhookEmitter.emit(product.sellerId, 'product.rejected', {
      productId,
      adminId,
      reason
    });

    return { message: 'Product rejected', reason };
  }
};

module.exports = SubmissionService;
