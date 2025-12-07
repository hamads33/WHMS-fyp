const PasswordResetService = require("../services/passwordReset.service");

const PasswordController = {
  ////////////////////////////////////////////////////////////////
  // POST /api/auth/password/request-reset
  ////////////////////////////////////////////////////////////////
  async requestReset(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });

      await PasswordResetService.requestReset(email);

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
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

      // redirect to frontend reset page
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

      // send success redirect
      const redirectTo = `${process.env.APP_URL}/auth/reset-success`;
      return res.json({ success: true, redirect: redirectTo });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: err.message });
    }
  }
};

module.exports = PasswordController;
