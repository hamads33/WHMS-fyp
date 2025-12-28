const router = require("express").Router();
const controller = require("../controllers/order.controller");

router.get("/orders", controller.adminListOrders);
router.get("/orders/:id", controller.getOrder);

module.exports = router;
