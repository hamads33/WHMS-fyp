const express = require("express");
const serviceCtrl = require("../controllers/service.controller");

const router = express.Router();

// client-safe listing
router.get("/services", serviceCtrl.listActive);

module.exports = router;
