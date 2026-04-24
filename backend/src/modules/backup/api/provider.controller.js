const express = require("express");
const router = express.Router();

const { listProviders } = require("../provider/registry");
const authGuard = require("../../auth/middlewares/auth.guard");

/* --------------------------------------------------------------------------
   LIST AVAILABLE BACKUP PROVIDERS
   GET /api/providers   (mounted under /api by index.js)
--------------------------------------------------------------------------- */
router.get("/", authGuard, (req, res) => {
  const providers = listProviders().map((p) => ({
    id: p.id,
    label: p.label,
    schema: p.schema,
  }));

  return res.json({
    success: true,
    data: providers,
  });
});

module.exports = router;
