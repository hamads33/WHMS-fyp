const { Router } = require("express");
const TrustedDeviceController = require("../controllers/trustedDevice.controller.js");
const authGuard = require("../middlewares/auth.guard.js");

const router = Router();

router.post("/", authGuard, TrustedDeviceController.create);
router.get("/", authGuard, TrustedDeviceController.list);
router.delete("/:deviceId", authGuard, TrustedDeviceController.revoke);
router.delete("/", authGuard, TrustedDeviceController.revokeAll);

module.exports = router;
