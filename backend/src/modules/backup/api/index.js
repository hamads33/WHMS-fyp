const express = require("express");
const router = express.Router();

/*
|--------------------------------------------------------------------------
| BOOTSTRAP (MUST RUN ONCE)
|--------------------------------------------------------------------------
| Loads built-in backup providers (local, s3, etc.)
| This MUST execute before any route is hit
*/
require("../bootstrap");

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
| All backup routes REQUIRE authentication
| Controllers depend on req.user
*/
const authGuard = require("../../auth/middlewares/auth.guard");

/*
|--------------------------------------------------------------------------
| ROUTES
|--------------------------------------------------------------------------
*/
router.use("/backups", authGuard, require("./backup.controller"));
router.use("/storage-configs", authGuard, require("./storageConfig.controller"));

module.exports = router;
