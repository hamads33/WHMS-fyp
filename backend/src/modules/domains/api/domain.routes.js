const express = require("express");
const router = express.Router();

const {
  checkAvailability,
  registerDomain
} = require("../domain/core/domain.service");

const { initiateTransfer } = require("../domain/core/domain.transfer");

/**
 * POST /domains/check
 * Check domain availability
 */
router.post("/check", async (req, res, next) => {
  try {
    const result = await checkAvailability(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /domains/register
 * Register a domain
 */
router.post("/register", async (req, res, next) => {
  try {
    const domain = await registerDomain(req.body);
    res.json(domain);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /domains/transfer
 * Initiate domain transfer (EPP)
 */
router.post("/transfer", async (req, res, next) => {
  try {
    const result = await initiateTransfer(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
