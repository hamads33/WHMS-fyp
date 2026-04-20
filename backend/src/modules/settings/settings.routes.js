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

// CyberPanel settings
router.get("/settings/cyberpanel", settingsCtrl.getCyberPanel);
router.put("/settings/cyberpanel", settingsCtrl.setCyberPanel);
router.post("/settings/cyberpanel/test", settingsCtrl.testCyberPanel);

router.get("/settings/:key", settingsCtrl.get);
router.put("/settings/:key", settingsCtrl.set);

module.exports = router;
