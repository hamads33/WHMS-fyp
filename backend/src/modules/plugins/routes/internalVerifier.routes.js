const express = require("express");
const RuntimeVerifierService = require("../services/runtimeVerifier.service");
const router = express.Router();

/**
 * Internal token middleware
 */
router.use((req, res, next) => {
  const token = req.headers["x-internal-token"];
  if (!token || token !== process.env.INTERNAL_ENGINE_TOKEN) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  next();
});

/**
 * POST /internal/engine/verifier/run
 * Trigger runtime sandbox test for a plugin version
 */
router.post("/verifier/run", async (req, res) => {
  try {
    const result = await RuntimeVerifierService.run(req.body);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
