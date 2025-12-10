// src/modules/marketplace/http/controllers/admin/approve-submission.controller.js
const ApprovalIntegration = require("../../../services/approvalIntegration.service");

module.exports = (deps) => async (req, res, next) => {
  try {
    const { prisma } = deps;
    const { submissionId } = req.params;

    const submission = await prisma.marketplaceSubmission.findUnique({
      where: { id: submissionId },
      include: { product: true, version: true }
    });

    if (!submission) return res.status(404).json({ error: "Submission not found" });

    const result = await ApprovalIntegration.approveSubmission({
      submission,
      prisma,
      reviewerId: req.user.id
    });

    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
};
