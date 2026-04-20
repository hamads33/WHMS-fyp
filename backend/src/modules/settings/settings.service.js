/**
 * Settings Service
 * Reads/writes key-value pairs in the SystemSetting table.
 */

const prisma = require('../../../prisma');

const SettingsService = {
  async get(key) {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  },

  async set(key, value) {
    return prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  },

  async getAll() {
    return prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  },

  // ── Provisioning helpers ──────────────────────────────────────────────────

  async getAutoProvisioning() {
    const val = await this.get('provisioning.auto');
    return val === null ? true : val === true || val === 'true';
  },

  async setAutoProvisioning(enabled) {
    return this.set('provisioning.auto', Boolean(enabled));
  },

  // ── CyberPanel SSH credential helpers ────────────────────────────────────
  // CyberPanel has no REST API — access is via SSH + cyberpanel CLI.

  async getCyberPanelCredentials() {
    const val = await this.get('provisioning.cyberpanel');
    return val || {
      host: '',
      sshPort: 22,
      sshUser: 'root',
      sshPrivateKey: '',
      sshPassword: '',
      adminUser: 'admin',
      adminPass: '',
      panelPort: 8090,
    };
  },

  async setCyberPanelCredentials({ host, sshPort, sshUser, sshPrivateKey, sshPassword, adminUser, adminPass, panelPort }) {
    return this.set('provisioning.cyberpanel', {
      host: host || '',
      sshPort: Number(sshPort || 22),
      sshUser: sshUser || 'root',
      sshPrivateKey: sshPrivateKey || '',
      sshPassword: sshPassword || '',
      adminUser: adminUser || 'admin',
      adminPass: adminPass || '',
      panelPort: Number(panelPort || 8090),
    });
  },

  async testCyberPanelConnection() {
    const creds = await this.getCyberPanelCredentials();
    if (!creds.host) {
      throw new Error('CyberPanel SSH host not configured');
    }
    if (!creds.sshPrivateKey && !creds.sshPassword) {
      throw new Error('No SSH credentials configured (need sshPrivateKey or sshPassword)');
    }
    const { CyberPanelDriver } = require('../provisioning/drivers/cyberpanel.driver');
    const driver = new CyberPanelDriver(creds);
    return driver.testConnection();
  },
};

module.exports = SettingsService;
