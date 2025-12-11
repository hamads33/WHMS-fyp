// src/modules/marketplace/admin/adminReview.routes.js
const express = require("express");
const controller = require("./adminReview.controller");

module.exports = function adminReviewRoutes({ prisma, logger } = {}) {
  if (!prisma) throw new Error("adminReviewRoutes requires { prisma }");

  const router = express.Router();

  // List submissions (filter by status query, default pending_review)
  // GET /api/admin/marketplace/submissions?status=pending_review
  router.get("/submissions", (req, res) => controller.list(req, res, { prisma, logger }));

  // Get single submission details
  // GET /api/admin/marketplace/submissions/:id
  router.get("/submissions/:id", (req, res) => controller.get(req, res, { prisma, logger }));

  // Approve submission
  // POST /api/admin/marketplace/submissions/:id/approve
  // Body: { reviewerId?: string, autoFill?: boolean, approveDependencies?: boolean }
  router.post("/submissions/:id/approve", (req, res) => controller.approve(req, res, { prisma, logger }));

  // Reject submission
  // POST /api/admin/marketplace/submissions/:id/reject
  // Body: { reviewerId?: string, reason?: string }
  router.post("/submissions/:id/reject", (req, res) => controller.reject(req, res, { prisma, logger }));

  return router;
};
