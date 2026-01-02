const express = require("express");
const router = express.Router();

const { adminRenewDomain } = require("../domain/core/domain.admin.service");
const { adminOverrideDomain } = require("../domain/core/domain.admin.override");

/**
 * POST /domains/admin/renew
 * Manual domain renewal
 */
router.post("/renew", async (req, res, next) => {
  try {
    const result = await adminRenewDomain(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /domains/admin/override
 * Admin override domain fields
 */
router.patch("/override", async (req, res, next) => {
  try {
    const result = await adminOverrideDomain(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
