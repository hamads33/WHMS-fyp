const router = require("express").Router();
const controller = require("../controllers/order.controller");

router.post("/orders", controller.createOrder);
router.get("/orders", controller.listClientOrders);
router.get("/orders/:id", controller.getOrder);
router.post("/orders/:id/cancel", controller.cancelOrder);

module.exports = router;
