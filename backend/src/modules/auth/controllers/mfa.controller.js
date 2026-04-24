const MFAService = require("../services/mfa.service");

const MFAController = {
  ////////////////////////////////////////////////////////
  // Step 1: Begin MFA setup (return QR code)
  ////////////////////////////////////////////////////////
  async setup(req, res) {
    try {
      const data = await MFAService.generateSetup(req.user);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  },

  ////////////////////////////////////////////////////////
  // Step 2: Confirm MFA (user submits OTP)
  ////////////////////////////////////////////////////////
  async verify(req, res) {
    try {
      const { code } = req.body;
      await MFAService.verifyTOTP(req.user.id, code);

      res.json({ success: true, message: "MFA enabled" });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  },

  ////////////////////////////////////////////////////////
  // Disable MFA
  ////////////////////////////////////////////////////////
  async disable(req, res) {
    try {
      const { code } = req.body;
      await MFAService.disable(req.user.id, code);

      res.json({ success: true, message: "MFA disabled" });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  },

  ////////////////////////////////////////////////////////
  // Generate backup codes
  ////////////////////////////////////////////////////////
  async backupCodes(req, res) {
    try {
      const codes = await MFAService.generateBackupCodes(req.user.id);
      res.json({ backupCodes: codes });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  },

  ////////////////////////////////////////////////////////
  // MFA LOGIN VERIFICATION — USER ENTERS OTP AFTER LOGIN
  ////////////////////////////////////////////////////////
  async verifyLogin(req, res) {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        return res.status(400).json({ error: "userId and code are required" });
      }

      const result = await MFAService.verifyLogin({
        userId,
        code,
        ip: req.ip,
        userAgent: req.get("User-Agent")
      });

      const cookieOptions = {
        httpOnly: true,
        secure: false, // true in production
        sameSite: "lax",
        path: "/",
      };

      res.cookie("access_token", result.accessToken, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 15,
      });

      res.cookie("refresh_token", result.refreshToken, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

      return res.json(result);

    } catch (err) {
      console.error("verifyLogin error:", err);
      return res.status(400).json({ error: err.message });
    }
  }
};

module.exports = MFAController;
