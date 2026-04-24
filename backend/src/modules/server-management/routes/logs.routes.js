const router = require("express").Router();
const provCtrl = require("../controllers/server-provisioning.controller");

router.get("/", provCtrl.getAllLogs);

module.exports = router;
