/**
 * Storage Paths Service
 * Manages configurable filesystem paths stored in SystemSetting.
 * Key: "storage_paths"
 */

const prisma = require("../../../prisma");
const path = require("path");

const SETTING_KEY = "storage_paths";

const DEFAULTS = {
  backupsPath: "storage/backups",
  broadcastsPath: "storage/broadcasts",
  pluginUploadsPath: "storage/plugin-uploads",
};

class StoragePathsService {
  async get() {
    const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    if (!row) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(row.value ?? {}) };
  }

  async update(data) {
    const allowed = Object.keys(DEFAULTS);
    const clean = {};
    for (const k of allowed) {
      if (k in data) clean[k] = data[k];
    }
    const existing = await this.get();
    const merged = { ...existing, ...clean };
    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: merged },
      create: { key: SETTING_KEY, value: merged },
    });
    return merged;
  }

  /** Resolve a stored path key to an absolute filesystem path */
  async resolve(key) {
    const settings = await this.get();
    const p = settings[key] || DEFAULTS[key];
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  }
}

module.exports = new StoragePathsService();
