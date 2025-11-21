// src/modules/plugins/controllers/installer.controller.js
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const os = require("os");
const PluginLoader = require("../pluginEngine/loader");
const registry = require("../pluginEngine/registry");
const { verifySignature } = require("../pluginEngine/verifier");

const PLUGINS_DIR = path.join(process.cwd(), "plugins", "actions");

class InstallerController {
  constructor({ logger, ajv, publicKeyPem }) {
    this.logger = logger;
    this.ajv = ajv;
    this.publicKeyPem = publicKeyPem;
  }

  async upload(req, res, next) {
    try {
      // multer set file in req.file
      const zipPath = req.file.path; // temp upload path
      const originalName = req.file.originalname;

      // optional: check signature file next to uploaded zip (client may upload signature too)
      const signaturePath = req.body.signaturePath || null;

      // Verify signature (if provided and publicKey present)
      if (signaturePath && this.publicKeyPem) {
        const ok = verifySignature({ filePath: zipPath, signaturePath, publicKeyPem: this.publicKeyPem });
        if (!ok) {
          return res.status(400).json({ success: false, error: { message: "Invalid signature" }});
        }
      }

      // Extract to temp dir
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-"));
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tmpDir, true);

      // Expect manifest.json in root
      const manifestPath = path.join(tmpDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) {
        throw new Error("manifest.json missing in plugin package");
      }
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      // Validate with AJV
      const manifestSchema = require("../validators/manifest.schema");
      const Ajv = require("ajv").default;
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(manifestSchema);
      if (!validate(manifest)) {
        return res.status(400).json({ success: false, error: { message: "Invalid manifest", details: validate.errors }});
      }

      const dest = path.join(PLUGINS_DIR, manifest.id);
      if (fs.existsSync(dest)) {
        // overwrite or error depending on policy; here we overwrite
        fs.rmSync(dest, { recursive: true, force: true });
      }
      fs.mkdirSync(dest, { recursive: true });

      // move extracted files into dest
      const items = fs.readdirSync(tmpDir);
      for (const item of items) {
        const src = path.join(tmpDir, item);
        const dst = path.join(dest, item);
        fs.renameSync(src, dst);
      }

      // cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
      try { fs.unlinkSync(zipPath); } catch (e) {}

      // reload registry
      const loader = new PluginLoader({ logger: this.logger, ajv });
      const plugins = loader.loadAll();
      registry.set(plugins);

      return res.json({ success: true, plugin: manifest.id });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InstallerController;
