/**
 * Settings Service
 * Reads/writes key-value pairs in the SystemSetting table.
 */

const prisma = require("../../../prisma");

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
    return prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  },

  // ── Provisioning helpers ──────────────────────────────────────

  async getAutoProvisioning() {
    const val = await this.get("provisioning.auto");
    return val === null ? true : val === true || val === "true";
  },

  async setAutoProvisioning(enabled) {
    return this.set("provisioning.auto", Boolean(enabled));
  },

  // ── VestaCP credential helpers ────────────────────────────────

  async getVestacpCredentials() {
    const val = await this.get("provisioning.vestacp");
    return val || { host: "", port: 8083, token: "" };
  },

  async setVestacpCredentials({ host, port, token }) {
    return this.set("provisioning.vestacp", { host, port: Number(port), token });
  },
};

module.exports = SettingsService;
