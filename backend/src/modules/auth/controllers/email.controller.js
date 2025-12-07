// src/modules/auth/controllers/email.controller.js
const AuthService = require("../services/auth.service");
const EmailTokenService = require("../services/emailToken.service");

class EmailController {
  /**
   * POST /api/auth/email/send
   * Accepts either { email, origin } or { userId, origin }.
   * Public route used by tests and by "resend" flows.
   */
  static async sendVerificationEmail(req, res) {
    try {
      const { email, userId, origin } = req.body;

      if (!email && !userId) {
        return res.status(400).json({ error: "email or userId is required" });
      }

      // Resolve user by id or by email
      let user = null;
      if (userId) {
        user = await AuthService.findUserById(userId);
      } else {
        user = await AuthService.findUserByEmail(email);
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // origin fallback — tests pass origin but support env fallback for manual API use
      const effectiveOrigin = origin || process.env.FRONTEND_ORIGIN || "http://localhost:3000";

      await EmailTokenService.sendVerificationEmail(user, effectiveOrigin);

      return res.json({ success: true });
    } catch (err) {
      console.error("SEND VERIFICATION ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/auth/email/verify?token=xxx
   */
  static async verifyEmailToken(req, res) {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      const user = await EmailTokenService.verifyEmailToken(String(token));

      return res.json({ success: true, userId: user.id });
    } catch (err) {
      console.error("VERIFY EMAIL ERROR:", err);
      return res.status(400).json({ error: err.message });
    }
  }

  // ... password reset / resetPassword remain unchanged ...
  static async requestPasswordReset(req, res) {
    try {
      const { email, origin } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const effectiveOrigin = origin || process.env.FRONTEND_ORIGIN || "http://localhost:3000";
      await EmailTokenService.sendPasswordResetEmail(email, effectiveOrigin);

      return res.json({ success: true });
    } catch (err) {
      console.error("REQUEST PASSWORD RESET ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ error: "Token and new password required" });

      await EmailTokenService.resetPassword(token, password);
      return res.json({ success: true });
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = EmailController;
