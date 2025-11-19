// src/modules/automation/controllers/marketplace.controller.js
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { loadPlugins } = require("../pluginEngine/pluginLoader");
const prisma = require("../../../lib/prisma");
const audit = require("../utils/audit");

const MARKETPLACE_CACHE = path.join(process.cwd(), "var", "marketplace_cache");
if (!fs.existsSync(MARKETPLACE_CACHE)) fs.mkdirSync(MARKETPLACE_CACHE, { recursive: true });

/**
 * GET /plugins/marketplace
 * Returns a curated set of plugin metadata (stubbed). In production, point to real marketplace URL.
 */
async function listMarketplace(req, res, next) {
  try {
    // Example: return static list or fetch from a remote JSON
    const curated = [
      {
        id: "hello_world",
        name: "Hello World",
        version: "1.0.0",
        description: "A simple test plugin",
        url: "https://example.com/hello_world.zip"
      }
    ];
    res.json({ ok: true, plugins: curated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /plugins/marketplace/install
 * body: { url: "https://..." }
 * Downloads zip, extracts into plugins/actions/<id>, syncs DB and reloads plugins
 */
async function installFromUrl(req, res, next) {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

    // download
    const resp = await fetch(url);
    if (!resp.ok) return res.status(400).json({ ok: false, error: "Failed to download plugin" });

    const buf = await resp.arrayBuffer();
    const name = `pkg_${Date.now()}`;
    const zipPath = path.join(MARKETPLACE_CACHE, `${name}.zip`);
    fs.writeFileSync(zipPath, Buffer.from(buf));

    const zip = new AdmZip(zipPath);
    const manifest = zip.getEntry("manifest.json");
    if (!manifest) return res.status(400).json({ ok: false, error: "manifest.json missing in archive" });

    const manifestData = JSON.parse(manifest.getData().toString("utf8"));
    if (!manifestData.id) return res.status(400).json({ ok: false, error: "manifest.id missing" });

    const pluginDir = path.join(process.cwd(), "plugins", "actions", manifestData.id);
    if (!fs.existsSync(pluginDir)) fs.mkdirSync(pluginDir, { recursive: true });

    zip.extractAllTo(pluginDir, true);

    // upsert into DB
    await prisma.plugin.upsert({
      where: { id: manifestData.id },
      create: {
        id: manifestData.id,
        name: manifestData.name || manifestData.id,
        version: manifestData.version || "1.0.0",
        enabled: true,
        source: "marketplace"
      },
      update: {
        name: manifestData.name || manifestData.id,
        version: manifestData.version || "1.0.0",
        enabled: true,
        source: "marketplace"
      }
    });

    await audit.logSystem("plugin.installed.marketplace", manifestData);

    // reload plugins
    await loadPlugins();

    res.json({ ok: true, installed: manifestData });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMarketplace,
  installFromUrl
};
