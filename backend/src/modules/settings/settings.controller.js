/**
 * Settings Controller
 * Path: src/modules/settings/settings.controller.js
 *
 * Admin endpoints for reading and writing system settings.
 * Includes auto-provisioning toggle.
 */

const SettingsService = require("./settings.service");

const SettingsController = {
  /**
   * GET /api/admin/settings
   * Returns all system settings.
   */
  async getAll(req, res) {
    try {
      const settings = await SettingsService.getAll();
      return res.json({ success: true, settings });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to fetch settings" });
    }
  },

  /**
   * GET /api/admin/settings/provisioning
   * Returns the current auto-provisioning status.
   */
  async getProvisioning(req, res) {
    try {
      const enabled = await SettingsService.getAutoProvisioning();
      return res.json({ success: true, autoProvisioning: enabled });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to fetch provisioning setting" });
    }
  },

  /**
   * PUT /api/admin/settings/provisioning
   * Body: { enabled: boolean }
   * Toggles auto-provisioning on or off.
   */
  async setProvisioning(req, res) {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }
      await SettingsService.setAutoProvisioning(enabled);
      return res.json({ success: true, autoProvisioning: enabled });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to update provisioning setting" });
    }
  },

  /**
   * GET /api/admin/settings/vestacp
   * Returns VestaCP credentials (token masked).
   */
  async getVestacp(req, res) {
    try {
      const creds = await SettingsService.getVestacpCredentials();
      // Mask token for display
      const masked = creds.token
        ? creds.token.slice(0, 4) + "****" + creds.token.slice(-4)
        : "";
      return res.json({ success: true, host: creds.host, port: creds.port, tokenMasked: masked, configured: !!creds.token });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to fetch VestaCP settings" });
    }
  },

  /**
   * PUT /api/admin/settings/vestacp
   * Body: { host, port, token }
   */
  async setVestacp(req, res) {
    try {
      const { host, port, token } = req.body;
      if (!host) {
        return res.status(400).json({ error: "host is required" });
      }
      // If token not provided, keep existing token
      let finalToken = token;
      if (!finalToken) {
        const existing = await SettingsService.getVestacpCredentials();
        finalToken = existing.token;
        if (!finalToken) {
          return res.status(400).json({ error: "API token is required" });
        }
      }
      await SettingsService.setVestacpCredentials({ host, port: port || 8083, token: finalToken });
      return res.json({ success: true, message: "VestaCP credentials saved" });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to save VestaCP settings" });
    }
  },

  /**
   * POST /api/admin/settings/vestacp/test
   * Tests connectivity using the stored (or provided) credentials.
   */
  async testVestacp(req, res) {
    try {
      const creds = await SettingsService.getVestacpCredentials();
      if (!creds.token) {
        return res.status(400).json({ error: "VestaCP credentials not configured yet" });
      }
      // Dynamically require client and test connection
      const { VestaCPClient } = require("../provisioning/clients/vestacp-client");
      const client = new VestaCPClient(creds);
      const result = await client.testConnection();
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(502).json({ success: false, error: err.message || "Connection failed" });
    }
  },

  /**
   * GET /api/admin/settings/:key
   * Returns a single setting by key.
   */
  async get(req, res) {
    try {
      const value = await SettingsService.get(req.params.key);
      if (value === null) {
        return res.status(404).json({ error: "Setting not found" });
      }
      return res.json({ success: true, key: req.params.key, value });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to fetch setting" });
    }
  },

  /**
   * PUT /api/admin/settings/:key
   * Body: { value: any }
   * Creates or updates a setting.
   */
  async set(req, res) {
    try {
      const { value } = req.body;
      if (value === undefined) {
        return res.status(400).json({ error: "value is required" });
      }
      await SettingsService.set(req.params.key, value);
      return res.json({ success: true, key: req.params.key, value });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to update setting" });
    }
  },
};

module.exports = SettingsController;
