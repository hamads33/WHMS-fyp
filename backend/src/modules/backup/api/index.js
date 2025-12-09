// src/modules/backup/api/index.js
const express = require("express");
const router = express.Router();

// Load built-in providers ONCE
require("../bootstrap");

// Mount routes
router.use("/backups", require("./backup.controller"));
router.use("/storage-configs", require("./storageConfig.controller"));

module.exports = router;
