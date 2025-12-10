// src/modules/plugins/controllers/installer.controller.js
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const os = require("os");
const registry = require("../pluginEngine/registry");
const { verifySignature } = require("../pluginEngine/verifier");

const PLUGINS_DIR = path.join(process.cwd(), "plugins", "actions");

class InstallerController {
  constructor({ logger, ajv, publicKeyPem } = {}) {
    this.logger = logger || console;
    this.ajv = ajv || null;
    this.publicKeyPem = publicKeyPem || null;
  }

  /**
   * Multer upload handler: expects file in req.file
   * - Extracts zip to temp, validates manifest, moves into plugins folder
   * - DOES NOT create a new PluginLoader instance
   * - Attempts to reload the shared engine via req.app.locals.pluginEngine.reload()
   */
  async upload(req, res, next) {
    try {
      if (!req || !req.file) {
        return res.status(400).json({ success: false, error: "no_file_uploaded" });
      }

      const zipPath = req.file.path;
      const originalName = req.file.originalname;
      const signaturePath = req.body.signaturePath || null;

      // optional signature verification
      if (signaturePath && this.publicKeyPem) {
        try {
          const ok = verifySignature({ filePath: zipPath, signaturePath, publicKeyPem: this.publicKeyPem });
          if (!ok) {
            return res.status(400).json({ success: false, error: { message: "Invalid signature" } });
          }
        } catch (e) {
          this.logger && this.logger.warn && this.logger.warn("signature verify error", e.message || e);
          return res.status(400).json({ success: false, error: { message: "signature_verification_failed" } });
        }
      }

      // extract to temp dir
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-"));
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tmpDir, true);

      // expect manifest.json at root
      const manifestPath = path.join(tmpDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
        return res.status(400).json({ success: false, error: "manifest.json missing in plugin package" });
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

      // Local AJV validation (independent of loader state)
      const manifestSchema = require("../validators/manifest.schema");
      const Ajv = require("ajv").default || require("ajv");
      const ajvInstance = new Ajv({ allErrors: true, strict: false });
      const validate = ajvInstance.compile(manifestSchema);
      if (!validate(manifest)) {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
        return res.status(400).json({ success: false, error: { message: "Invalid manifest", details: validate.errors }});
      }

      const dest = path.join(PLUGINS_DIR, manifest.id);

      // Ensure dest exists; remove only if present (we'll replace)
      if (fs.existsSync(dest)) {
        try {
          fs.rmSync(dest, { recursive: true, force: true });
        } catch (e) {
          this.logger && this.logger.warn && this.logger.warn(`InstallerController: failed to remove existing plugin folder ${dest}`, e.message || e);
        }
      }
      fs.mkdirSync(dest, { recursive: true });

      // move extracted files into dest
      const items = fs.readdirSync(tmpDir);
      for (const item of items) {
        const src = path.join(tmpDir, item);
        const dst = path.join(dest, item);
        fs.renameSync(src, dst);
      }

      // cleanup tmp and uploaded zip
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      try { fs.unlinkSync(zipPath); } catch (_) {}

      // Register lightweight metadata (non-destructive)
      try {
        if (registry && typeof registry.register === "function") {
          registry.register(manifest.id, {
            id: manifest.id,
            name: manifest.name || manifest.id,
            version: manifest.version || "1.0.0",
            manifest
          });
        }
      } catch (e) {
        this.logger && this.logger.warn && this.logger.warn("InstallerController: registry.register failed", e.message || e);
      }

      // IMPORTANT: reload the shared engine (do NOT create a new PluginLoader)
      try {
        const engine = req.app && req.app.locals && req.app.locals.pluginEngine;
        if (!engine || !engine.loader) {
          this.logger && this.logger.warn && this.logger.warn("InstallerController: plugin engine not available for reload");
          return res.json({ success: true, plugin: manifest.id, warning: "engine_reload_unavailable" });
        }

        if (typeof engine.reload === "function") {
          await engine.reload();
        } else if (typeof engine.loader.loadAll === "function") {
          const plugins = await engine.loader.loadAll();
          engine.plugins = plugins;
        } else {
          this.logger && this.logger.warn && this.logger.warn("InstallerController: no reload method found on engine");
        }
      } catch (e) {
        this.logger && this.logger.warn && this.logger.warn("InstallerController: engine reload failed", e.message || e);
        return res.json({ success: true, plugin: manifest.id, warning: "engine_reload_failed" });
      }

      return res.json({ success: true, plugin: manifest.id });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InstallerController;
