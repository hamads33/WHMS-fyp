const { Router } = require("express");
const  authGuard  = require("../middlewares/auth.guard");
const adminPortalGuard = require("../guards/adminPortal.guard");
const ImpersonationLogsController = require("../controllers/impersonationLogs.controller");

const router = Router();

router.get("/logs", authGuard, adminPortalGuard, ImpersonationLogsController.list);

module.exports = router;
