const BuildLogStore = require('../stores/buildLogStore');

const BuildLogService = {
  async append({ submissionId = null, productId = null, versionId = null, level = 'info', step = null, message = '', meta = null }) {
    // normalize message
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    return BuildLogStore.create({ submissionId, productId, versionId, level, step, message: msg, meta });
  },

  async listForSubmission(submissionId, opts = {}) {
    return BuildLogStore.listBySubmission(submissionId, opts);
  },

  async listForProduct(productId, opts = {}) {
    return BuildLogStore.listByProduct(productId, opts);
  },

  async tail(submissionId, afterTimestamp = null, limit = 200) {
    return BuildLogStore.tail(submissionId, { afterTimestamp, limit });
  },

  async get(id) {
    return BuildLogStore.findById(id);
  }
};

module.exports = BuildLogService;
