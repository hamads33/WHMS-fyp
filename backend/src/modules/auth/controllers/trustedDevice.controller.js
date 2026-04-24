const TrustedDeviceService = require("../services/trustedDevice.service");

const COOKIE_NAME = "trusted_device_id";

class TrustedDeviceController {
  // Create device & set cookie
  static async create(req, res) {
    try {
      const { name } = req.body;

      const { deviceId, expiresAt } = await TrustedDeviceService.createTrustedDevice({
        userId: req.user.id,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
        name
      });

      res.cookie(COOKIE_NAME, deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt
      });

      res.json({ deviceId, expiresAt });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  }

  // List user's devices
  static async list(req, res) {
    try {
      const devices = await TrustedDeviceService.listDevices(req.user.id);
      res.json({ devices });
    } catch (err) {
      res.status(500).json({ error: "Failed to list devices" });
    }
  }

  // Revoke single device
  static async revoke(req, res) {
    try {
      const { deviceId } = req.params;
      await TrustedDeviceService.revokeDevice(deviceId, req.user.id);
      res.clearCookie(COOKIE_NAME);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // Revoke ALL devices
  static async revokeAll(req, res) {
    try {
      await TrustedDeviceService.revokeAllDevices(req.user.id);
      res.clearCookie(COOKIE_NAME);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = TrustedDeviceController;
module.exports.COOKIE_NAME = COOKIE_NAME;
