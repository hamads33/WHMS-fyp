// src/modules/marketplace/http/controllers/submission-approval.controller.js

const ApprovalIntegration = require("../../services/approvalIntegration.service");

module.exports = {
  /**
   * Admin → Approve Submission
   */
  approveSubmission: async (req, res) => {
    try {
      const { submissionId } = req.params;
      const adminId = req.user?.id || "admin-system"; // dummy fallback

      const result = await ApprovalIntegration.approveSubmission(submissionId, adminId);

      if (!result.ok) {
        return res.status(500).json({
          ok: false,
          error: result.error || "approval_failed",
          detail: result.detail
        });
      }

      return res.json({
        ok: true,
        message: "Submission approved and installed successfully",
        submission: result.submission
      });
    } catch (err) {
      console.error("Admin Approve Submission Error:", err);
      return res.status(500).json({
        ok: false,
        error: "internal_error",
        detail: err.message
      });
    }
  },

  /**
   * Admin → Reject Submission
   */
  rejectSubmission: async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.id || "admin-system";

      const result = await ApprovalIntegration.rejectSubmission(
        submissionId,
        reason,
        adminId
      );

      if (!result.ok) {
        return res.status(400).json(result);
      }

      return res.json({
        ok: true,
        message: "Submission rejected",
        submission: result.submission
      });
    } catch (err) {
      console.error("Admin Reject Submission Error:", err);
      return res.status(500).json({
        ok: false,
        error: "internal_error",
        detail: err.message
      });
    }
  }
};
