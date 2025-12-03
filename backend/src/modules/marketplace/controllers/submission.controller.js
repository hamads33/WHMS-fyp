const SubmissionStore = require('../stores/submissionStore');
const VersionStore = require('../stores/versionStore');
const ProductStore = require('../stores/productStore');
const VerificationPipeline = require('../services/verificationPipeline.service');
const BuildLogService = require('../services/buildLog.service');

module.exports = {
  async list(req, res) {
    try {
      const rows = await SubmissionStore.listAll();
      res.json({ ok: true, data: rows });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  async approve(req, res) {
    // This route now triggers verification pipeline and returns results
    try {
      const submissionId = req.params.submissionId;
      const adminId = req.user.id;

      const submission = await SubmissionStore.findById(submissionId);
      if (!submission) return res.status(404).json({ ok: false, message: 'submission not found' });

      const version = submission.versionId ? await VersionStore.findById(submission.versionId) : null;
      if (!version) return res.status(400).json({ ok: false, message: 'no version attached' });

      const product = await ProductStore.findById(submission.productId);

      // prepare context for verification
      const ctx = {
        submissionId,
        productId: submission.productId,
        versionId: submission.versionId,
        archivePath: version.archivePath,
        manifestJson: version.manifestJson,
        sellerId: product.sellerId,
        signature: version.manifestJson && version.manifestJson.signature || null,
        pluginFolder: version.archiveExtractPath || null, // if pluginInstaller extracted into a folder; optional
        autoInstallDeps: true
      };

      // append build log entry
      await BuildLogService.append({ submissionId, productId: submission.productId, versionId: submission.versionId, level: 'info', step: 'approve.start', message: `Admin ${adminId} started verification` });

      // run pipeline
      const report = await VerificationPipeline.run(ctx);

      // update submission with status depending on result
      if (report.passed) {
        await SubmissionStore.update(submissionId, { status: 'approved', reviewerId: adminId });
        // Optionally publish product / create verification record already done by pipeline
      } else {
        await SubmissionStore.update(submissionId, { status: 'rejected', reviewerId: adminId, notes: JSON.stringify(report.issues) });
      }

      return res.json({ ok: true, data: { report, submissionId } });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  },

  async reject(req, res) {
    try {
      const submissionId = req.params.submissionId;
      const adminId = req.user.id;
      const reason = req.body.reason || 'Not specified';

      await SubmissionStore.update(submissionId, { status: 'rejected', reviewerId: adminId, notes: reason });
      return res.json({ ok: true, message: 'Submission rejected' });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  }
};
