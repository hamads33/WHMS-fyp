/**
 * Settings Controller
 * Path: src/modules/settings/settings.controller.js
 *
 * Admin endpoints for reading and writing system settings.
 * Includes auto-provisioning toggle and CyberPanel SSH credentials.
 */

const SettingsService = require('./settings.service');

const SettingsController = {
  /**
   * GET /api/admin/settings
   */
  async getAll(req, res) {
    try {
      const settings = await SettingsService.getAll();
      return res.json({ success: true, settings });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to fetch settings' });
    }
  },

  /**
   * GET /api/admin/settings/provisioning
   */
  async getProvisioning(req, res) {
    try {
      const enabled = await SettingsService.getAutoProvisioning();
      return res.json({ success: true, autoProvisioning: enabled });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to fetch provisioning setting' });
    }
  },

  /**
   * PUT /api/admin/settings/provisioning
   * Body: { enabled: boolean }
   */
  async setProvisioning(req, res) {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' });
      }
      await SettingsService.setAutoProvisioning(enabled);
      return res.json({ success: true, autoProvisioning: enabled });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to update provisioning setting' });
    }
  },

  /**
   * GET /api/admin/settings/cyberpanel
   * Returns SSH config — private key and password are never returned to client.
   */
  async getCyberPanel(req, res) {
    try {
      const creds = await SettingsService.getCyberPanelCredentials();
      return res.json({
        success: true,
        host: creds.host,
        sshPort: creds.sshPort,
        sshUser: creds.sshUser,
        adminUser: creds.adminUser,
        panelPort: creds.panelPort || 8090,
        adminPassSet: !!(creds.adminPass),  // never return the actual password
        configured: !!(creds.host && (creds.sshPrivateKey || creds.sshPassword)),
        authType: creds.sshPrivateKey ? 'key' : creds.sshPassword ? 'password' : 'none',
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to fetch CyberPanel settings' });
    }
  },

  /**
   * PUT /api/admin/settings/cyberpanel
   * Body: { host, sshPort, sshUser, sshPrivateKey, sshPassword, adminUser, adminPass, panelPort }
   *
   * SSH key/password and adminPass are preserved from existing values if not provided.
   */
  async setCyberPanel(req, res) {
    try {
      const { host, sshPort, sshUser, sshPrivateKey, sshPassword, adminUser, adminPass, panelPort } = req.body;

      if (!host) {
        return res.status(400).json({ error: 'host is required' });
      }

      // Preserve existing SSH credentials if new ones are not provided
      const existing = await SettingsService.getCyberPanelCredentials();

      let finalKey = sshPrivateKey || '';
      let finalPass = sshPassword || '';

      if (!finalKey && !finalPass) {
        finalKey = existing.sshPrivateKey || '';
        finalPass = existing.sshPassword || '';
        if (!finalKey && !finalPass) {
          return res.status(400).json({
            error: 'Either sshPrivateKey (recommended) or sshPassword is required',
          });
        }
      }

      // Preserve existing adminPass if not provided
      const finalAdminPass = adminPass || existing.adminPass || '';

      await SettingsService.setCyberPanelCredentials({
        host,
        sshPort: sshPort || 22,
        sshUser: sshUser || 'root',
        sshPrivateKey: finalKey,
        sshPassword: finalPass,
        adminUser: adminUser || 'admin',
        adminPass: finalAdminPass,
        panelPort: panelPort || 8090,
      });

      return res.json({ success: true, message: 'CyberPanel SSH credentials saved' });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to save CyberPanel settings' });
    }
  },

  /**
   * POST /api/admin/settings/cyberpanel/test
   * Tests SSH connectivity using stored credentials.
   */
  async testCyberPanel(req, res) {
    try {
      const result = await SettingsService.testCyberPanelConnection();
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(502).json({ success: false, error: err.message || 'Connection failed' });
    }
  },

  /**
   * GET /api/admin/settings/:key
   */
  async get(req, res) {
    try {
      const value = await SettingsService.get(req.params.key);
      if (value === null) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      return res.json({ success: true, key: req.params.key, value });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to fetch setting' });
    }
  },

  /**
   * PUT /api/admin/settings/:key
   * Body: { value: any }
   */
  async set(req, res) {
    try {
      const { value } = req.body;
      if (value === undefined) {
        return res.status(400).json({ error: 'value is required' });
      }
      await SettingsService.set(req.params.key, value);
      return res.json({ success: true, key: req.params.key, value });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to update setting' });
    }
  },

  /**
   * GET /api/admin/settings/notifications
   */
  async getNotifications(req, res) {
    try {
      const NOTIFICATION_KEYS = [
        'service.activated',
        'service.suspended',
        'service.terminated',
        'billing.invoice_created',
        'billing.payment_received',
        'billing.payment_overdue',
        'billing.refund_issued',
        'order.placed',
        'support.ticket_created',
        'support.ticket_reply',
        'support.ticket_closed',
      ];

      const prisma = require('../../../prisma');
      const rows = await prisma.systemSetting.findMany({
        where: { key: { in: NOTIFICATION_KEYS.map((k) => `notifications.${k}`) } },
      });

      const settingsMap = {};
      for (const row of rows) {
        const key = row.key.replace('notifications.', '');
        settingsMap[key] = row.value !== false && row.value !== 'false';
      }

      const result = {};
      for (const key of NOTIFICATION_KEYS) {
        result[key] = settingsMap[key] !== undefined ? settingsMap[key] : true;
      }

      return res.json({ success: true, notifications: result });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Failed to fetch notification settings' });
    }
  },
};

module.exports = SettingsController;
