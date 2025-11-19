// src/modules/automation/routes.js
// Main automation routes (profiles, tasks, actions, tests, plugins, cron)

const express = require("express");
const multer = require("multer");

// Controllers
const profileController = require("./controllers/profile.controller");
const taskController = require("./controllers/task.controller");
const actionController = require("./controllers/action.controller");
const testController = require("./controllers/test.controller");
const pluginController = require("./controllers/plugin.controller");
const pluginUpload = require("./controllers/pluginUpload.controller");
const cronController = require("./controllers/cron.controller"); // ✅ FIXED (missing)

// at top along with other controllers
const marketplaceController = require('./controllers/marketplace.controller');
const router = express.Router();

// ✅ Multer disk storage for plugin upload
const upload = multer({
  dest: "uploads/plugins/tmp", // safely uploaded here before extraction
});

/* ------------------------------------
 * PROFILES
 * ----------------------------------*/
router.get("/profiles", profileController.listProfiles);
router.post("/profiles", profileController.createProfile);
router.get("/profiles/:id", profileController.getProfile);
router.put("/profiles/:id", profileController.updateProfile);
router.delete("/profiles/:id", profileController.deleteProfile);

/* ------------------------------------
 * TASKS
 * ----------------------------------*/
/* ------------------------------------
 * TASKS
 * ----------------------------------*/
router.get('/tasks', taskController.listTasks);   // <-- NEW
router.post('/tasks', taskController.createTask);
router.get('/tasks/:id', taskController.getTask);
router.put('/tasks/:id', taskController.updateTask);
router.delete('/tasks/:id', taskController.deleteTask);
router.post('/tasks/:id/run', taskController.runTaskNow);

/* ------------------------------------
 * ACTIONS
 * ----------------------------------*/
router.get("/actions", actionController.listActions);

/* ------------------------------------
 * PLUGIN MANAGEMENT
 * ----------------------------------*/
router.get("/plugins", pluginController.listPlugins);

router.post(
  "/plugins/upload",
  upload.single("plugin"),
  pluginUpload.uploadPlugin
);

/* ------------------------------------
 * CRON BUILDER
 * ----------------------------------*/
router.post("/cron/build", cronController.buildCron);
router.post("/cron/validate", cronController.validateCron);

/* ------------------------------------
 * TEST ACTIONS
 * ----------------------------------*/
router.post("/actions/:actionId/test", testController.testAction);





// add routes (under PLUGIN MANAGEMENT)
router.get('/plugins/marketplace', marketplaceController.listMarketplace);
router.post('/plugins/marketplace/install', marketplaceController.installFromUrl);
module.exports = router;