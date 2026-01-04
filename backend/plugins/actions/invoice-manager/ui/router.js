const express = require("express");
const path = require("path");

const router = express.Router();

// Serve static UI files
router.use(
  express.static(path.join(__dirname))
);

// Default dashboard route
router.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "Dashboard.html"));
});

module.exports = router;
