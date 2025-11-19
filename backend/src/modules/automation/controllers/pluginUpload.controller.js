const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const prisma = require("../../../lib/prisma");
const AuditService = require("../utils/audit");
const { loadPlugins } = require("../pluginEngine/pluginLoader");

const PLUGIN_DIR = path.join(process.cwd(), "plugins/actions");

async function uploadPlugin(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing plugin file" });

    const zip = new AdmZip(req.file.path);
    const entries = zip.getEntries();

    const manifestEntry = entries.find(e => e.entryName.endsWith("manifest.json"));
    if (!manifestEntry) {
      return res.status(400).json({ error: "manifest.json not found" });
    }

    const manifest = JSON.parse(manifestEntry.getData().toString("utf8"));
    if (!manifest.id || !manifest.version || !manifest.name) {
      return res.status(400).json({ error: "Invalid manifest.json" });
    }

    const pluginPath = path.join(PLUGIN_DIR, manifest.id);
    if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath, { recursive: true });

    zip.extractAllTo(pluginPath, true);

    await prisma.plugin.upsert({
      where: { id: manifest.id },
      create: {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        source: "user",
        enabled: true,
      },
      update: {
        name: manifest.name,
        version: manifest.version,
        source: "user",
        enabled: true
      }
    });

    await AuditService.logSystem("plugin.installed", manifest);

    await loadPlugins();

    res.json({
      ok: true,
      installed: manifest
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadPlugin };
