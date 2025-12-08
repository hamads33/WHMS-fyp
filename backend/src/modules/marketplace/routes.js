const express = require("express");
const router = express.Router();

// Import the single HTTP router file
router.use("/", require("./http/routes"));

// Export unified marketplace router
module.exports = router;
