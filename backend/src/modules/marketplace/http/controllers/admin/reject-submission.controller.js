// src/modules/marketplace/http/controllers/admin/reject-submission.controller.js
const ApprovalIntegration = require("../../../services/approvalIntegration.service");

module.exports = ({ prisma }) => async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { notes } = req.body;

    const submission = await prisma.marketplaceSubmission.update({
      where: { id: submissionId },
      data: { status: "rejected", notes, reviewerId: req.user.id }
    });

    res.json({ success: true, submission });
  } catch (err) {
    next(err);
  }
};
