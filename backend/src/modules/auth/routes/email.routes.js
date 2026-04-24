// src/modules/auth/routes/email.routes.js

const { Router } = require("express");
const authGuard = require("../middlewares/auth.guard");
const EmailController = require("../controllers/email.controller");
const EmailTokenService = require("../services/emailToken.service");

const router = Router();

/**
 * Public: Verify email with token
 */
router.get("/verify", EmailController.verifyEmailToken);

/**
 * Public: Request verification email using email + origin
 */
router.post("/send", EmailController.sendVerificationEmail);

/**
 * Logged-in users may request their own verification email
 */
router.post("/send-verification", authGuard, async (req, res) => {
  try {
    const origin = req.body.origin || "http://localhost:3000";
    await EmailTokenService.sendVerificationEmail(req.user, origin);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Password Reset Routes
 */
router.post("/request-password-reset", EmailController.requestPasswordReset);
router.post("/reset-password", EmailController.resetPassword);

module.exports = router;
