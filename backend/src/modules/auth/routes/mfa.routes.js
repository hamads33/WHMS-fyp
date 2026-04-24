const { Router } = require("express");
const  authGuard  = require("../middlewares/auth.guard");
const MFAController = require("../controllers/mfa.controller");

const router = Router();

// Setup MFA
router.post("/setup", authGuard, MFAController.setup);
router.post("/verify", authGuard, MFAController.verify);
router.post("/disable", authGuard, MFAController.disable);
router.post("/backup-codes", authGuard, MFAController.backupCodes);

// MFA login verification (NO authGuard)
router.post("/verify-login", MFAController.verifyLogin);

module.exports = router;
