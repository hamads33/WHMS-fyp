// src/modules/marketplace/middleware/validation.middleware.js

function validateSubmission(req, res, next) {
  const { name, slug, version } = req.body;
  const errors = [];

  if (!name || typeof name !== "string") {
    errors.push("name is required");
  }

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    errors.push("slug must be lowercase and hyphenated");
  }

  if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
    errors.push("version must follow semver (x.y.z)");
  }

  if (errors.length) {
    return res.status(400).json({ ok: false, errors });
  }

  next();
}

function validateRating(req, res, next) {
  const { rating, text } = req.body;
  const errors = [];

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push("rating must be between 1 and 5");
  }

  if (text && typeof text !== "string") {
    errors.push("text must be string");
  }

  if (errors.length) {
    return res.status(400).json({ ok: false, errors });
  }

  next();
}

function validateReviewDecision(req, res, next) {
  const { action, notes } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({
      ok: false,
      error: "action must be approve or reject",
    });
  }

  if (notes && typeof notes !== "string") {
    return res.status(400).json({
      ok: false,
      error: "notes must be string",
    });
  }

  next();
}

function validateProductId(req, res, next) {
  if (!/^[a-f0-9-]{36}$/.test(req.params.id)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid product ID",
    });
  }
  next();
}

module.exports = {
  validateSubmission,
  validateRating,
  validateReviewDecision,
  validateProductId,
};
