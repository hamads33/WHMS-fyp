const express = require("express");
const router = express.Router();

/**
 * Domain module entry point
 */

// User domain routes
router.use("/domains", require("./api/domain.routes"));

// DNS routes
router.use("/domains", require("./api/domain.dns.routes"));

// Admin routes
router.use("/admin/domains", require("./api/domain.admin.routes"));

module.exports = router;
