const express = require("express");
const router = express.Router();

router.use("/tlds", require("./routes/tld.routes"));
router.use("/", require("./routes/domain.routes"));

module.exports = router;
