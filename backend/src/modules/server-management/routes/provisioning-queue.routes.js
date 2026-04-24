const router = require("express").Router();
const ctrl = require("../controllers/provisioning-queue.controller");

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/:id/retry", ctrl.retry);

module.exports = router;
