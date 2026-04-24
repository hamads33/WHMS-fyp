const PasswordResetService = require("../services/passwordReset.service");
const EmailTokenService = require("../services/emailToken.service");

const PasswordController = {
  ////////////////////////////////////////////////////////////////
  // POST /api/auth/password/request-reset
  // USER SELF RESET (EMAIL TOKEN BASED)
  ////////////////////////////////////////////////////////////////
  async requestReset(req, res) {
    try {
      const { email, origin } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });

      const effectiveOrigin =
        origin || process.env.FRONTEND_ORIGIN || "http://localhost:3000";

      // ✅ Correct user self-reset flow
      await EmailTokenService.sendPasswordResetEmail(
        email,
        effectiveOrigin
      );

      // Prevent email enumeration
      return res.json({ success: true });
    } catch (err) {
      console.error("REQUEST RESET ERROR:", err);
      return res.status(400).json({ error: err.message });
    }
  },

  ////////////////////////////////////////////////////////////////
  // GET /api/auth/password/reset?token=RAW_TOKEN
  ////////////////////////////////////////////////////////////////
  async verifyPage(req, res) {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).send("Missing token");

      const row = await PasswordResetService.verifyToken(token);
      if (!row) return res.status(400).send("Invalid or expired token");

      const resetPage = `${process.env.APP_URL}/auth/reset-password?token=${token}`;
      return res.redirect(302, resetPage);
    } catch (err) {
      console.error(err);
      return res.status(400).send("Error validating token");
    }
  },

  ////////////////////////////////////////////////////////////////
  // POST /api/auth/password/reset
  ////////////////////////////////////////////////////////////////
  async reset(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: "token & newPassword required" });
      }

      await PasswordResetService.resetPassword(token, newPassword);

      const redirectTo = `${process.env.APP_URL}/auth/reset-success`;
      return res.json({ success: true, redirect: redirectTo });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: err.message });
    }
  }
};

module.exports = PasswordController;
