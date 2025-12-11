// src/modules/marketplace/admin/adminReview.controller.js
const service = require("./adminReview.service");

async function list(req, res, ctx) {
  const { prisma, logger } = ctx;
  try {
    const { status = "pending_review", limit = 50, offset = 0 } = req.query;
    const data = await service.listPending({ prisma, status, limit: Number(limit), offset: Number(offset) });
    return res.json({ ok: true, submissions: data });
  } catch (err) {
    logger && logger.error && logger.error("adminReview.list error", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

async function get(req, res, ctx) {
  const { prisma, logger } = ctx;
  try {
    const submissionId = req.params.id;
    const item = await service.getDetails({ prisma, submissionId });
    if (!item) return res.status(404).json({ ok: false, error: "submission_not_found" });
    return res.json({ ok: true, submission: item });
  } catch (err) {
    logger && logger.error && logger.error("adminReview.get error", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

/**
 * Approve endpoint:
 * Body: { reviewerId?: string, autoFill?: boolean (default true), approveDependencies?: boolean (default false) }
 */
async function approve(req, res, ctx) {
  const { prisma, logger } = ctx;
  try {
    const submissionId = req.params.id;
    const { reviewerId = null, autoFill = true, approveDependencies = false } = req.body || {};
    const result = await service.approveSubmission({ prisma, submissionId, reviewerId, autoFill, approveDependencies, logger });
    if (!result.ok) {
      // forward structured error (e.g., dependencies_require_approval)
      return res.status(result.code || 400).json(result);
    }
    return res.json({ ok: true, message: "submission_approved", details: result.details || null });
  } catch (err) {
    logger && logger.error && logger.error("adminReview.approve error", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

async function reject(req, res, ctx) {
  const { prisma, logger } = ctx;
  try {
    const submissionId = req.params.id;
    const { reviewerId = null, reason = "" } = req.body || {};
    const result = await service.rejectSubmission({ prisma, submissionId, reviewerId, reason });
    if (!result.ok) return res.status(result.code || 400).json(result);
    return res.json({ ok: true, message: "submission_rejected", submission: result.submission || null });
  } catch (err) {
    logger && logger.error && logger.error("adminReview.reject error", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

module.exports = { list, get, approve, reject };
