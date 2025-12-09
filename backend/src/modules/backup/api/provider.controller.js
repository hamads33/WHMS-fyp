const express = require("express");
const router = express.Router();
const { listProviders } = require("../provider/registry");

router.get("/", async (req, res) => {
  const providers = listProviders().map(p => ({
    id: p.id,
    label: p.label,
    schema: p.schema
  }));
  res.json({ success:true, data: providers });
});

module.exports = router;
