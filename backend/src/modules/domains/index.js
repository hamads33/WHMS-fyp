const express = require("express");
const router = express.Router();

/**
 * Domain module entry point
 */

router.use("/", require("./api/domain.routes"));
router.use("/admin", require("./api/domain.admin.routes"));
router.use("/", require("./api/domain.dns.routes"));

module.exports = router;
