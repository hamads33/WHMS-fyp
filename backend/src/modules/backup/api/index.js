// src/modules/backup/api/index.js
const express = require("express");
const router = express.Router();

/*
|--------------------------------------------------------------------------
| BOOTSTRAP
|--------------------------------------------------------------------------
| Must run once before any backup logic
*/
require("../bootstrap");

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/
const authGuard = require("../../auth/middlewares/auth.guard");

/*
|--------------------------------------------------------------------------
| HIGH-PRIORITY ROUTES (NO PARAMS)
|--------------------------------------------------------------------------
| These MUST be mounted before any /:id routes
*/

/* ---------- Stats & Health ---------- */
router.use(
  "/backups/stats",
  authGuard,
  require("../controllers/backup.stats.controller")
);

/* ---------- Analytics ---------- */
router.use(
  "/backups/analytics",
  authGuard,
  require("../controllers/backup.analytics.controller")
);

/* ---------- Bulk Operations ---------- */
router.use(
  "/backups/bulk-delete",
  authGuard,
  require("../controllers/backup.bulk.controller")
);

/*
|--------------------------------------------------------------------------
| PARAMETERIZED BACKUP ROUTES
|--------------------------------------------------------------------------
| These depend on :id and must come AFTER analytics/stats
*/

/* ---------- Logs & Status ---------- */
router.use(
  "/backups/:id/logs",
  authGuard,
  require("../controllers/backup.logs.controller")
);

/* ---------- Retention Info ---------- */
router.use(
  "/backups/:id/retention-info",
  authGuard,
  require("../controllers/backup.retention.controller")
);

/*
|--------------------------------------------------------------------------
| GENERIC BACKUP ROUTES
|--------------------------------------------------------------------------
| CRUD, listing, create, etc.
| MUST be last because it likely defines /:id
*/
router.use(
  "/backups",
  authGuard,
  require("./backup.controller")
);

/*
|--------------------------------------------------------------------------
| STORAGE CONFIGURATION ROUTES
|--------------------------------------------------------------------------
*/
router.use(
  "/storage-configs",
  authGuard,
  require("./storageConfig.controller")
);

module.exports = router;
