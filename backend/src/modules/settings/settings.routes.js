const router = require("express").Router();
const storagePathsCtrl = require("./storage-paths.controller");
const settingsCtrl = require("./settings.controller");

router.get("/settings/storage-paths", storagePathsCtrl.get);
router.put("/settings/storage-paths", storagePathsCtrl.update);

// System settings (admin)
router.get("/settings", settingsCtrl.getAll);
router.get("/settings/provisioning", settingsCtrl.getProvisioning);
router.put("/settings/provisioning", settingsCtrl.setProvisioning);
router.get("/settings/notifications", settingsCtrl.getNotifications);
router.get("/settings/vestacp", settingsCtrl.getVestacp);
router.put("/settings/vestacp", settingsCtrl.setVestacp);
router.post("/settings/vestacp/test", settingsCtrl.testVestacp);
router.get("/settings/:key", settingsCtrl.get);
router.put("/settings/:key", settingsCtrl.set);

module.exports = router;
