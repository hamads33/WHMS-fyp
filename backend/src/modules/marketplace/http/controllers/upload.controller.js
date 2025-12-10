// src/modules/marketplace/http/controllers/upload.controller.js
const path = require("path");
const fs = require("fs");
const util = require("util");
const rimraf = util.promisify(require("fs").rm); // node 18+ supports fs.rmSync; we use promisified rm for cleanup
const { extractZipToDir } = require("../../utils/extractZip");
const manifestValidator = require("../../services/manifestValidator");
const securityValidator = require("../../services/securityValidator");

const moveFile = (src, dest) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
};

async function uploadVersion(req, res) {
  const { prisma, logger, uploadsTmp, storageDest } = req.ctx || {};
  const file = req.file;
  const productId = req.params.productId;
  const versionField = req.body.version; // recommended, but manifest will also contain version

  if (!file) return res.status(400).json({ ok: false, error: "missing_file" });
  if (!productId) return res.status(400).json({ ok: false, error: "missing_productId" });

  // temp extraction dir
  const tmpExtractDir = path.join(uploadsTmp, `mpk_${Date.now()}_${Math.round(Math.random() * 9999)}`);

  try {
    // 1) extract
    const extracted = extractZipToDir(file.path, tmpExtractDir);
    if (!extracted) {
      await rimraf(tmpExtractDir, { recursive: true, force: true }).catch(() => {});
      fs.unlinkSync(file.path);
      return res.status(400).json({ ok: false, error: "zip_extract_failed" });
    }

    // 2) find and parse manifest
    const manifestPath = path.join(tmpExtractDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      await rimraf(tmpExtractDir, { recursive: true, force: true }).catch(() => {});
      fs.unlinkSync(file.path);
      return res.status(400).json({ ok: false, error: "manifest_missing" });
    }

    const raw = fs.readFileSync(manifestPath, "utf8");
    let manifest;
    try {
      manifest = JSON.parse(raw);
    } catch (e) {
      await rimraf(tmpExtractDir, { recursive: true, force: true }).catch(() => {});
      fs.unlinkSync(file.path);
      return res.status(400).json({ ok: false, error: "manifest_json_invalid", details: e.message });
    }

    // 3) Validate manifest schema + referenced files + dependencies format
    const manifestValidation = manifestValidator.validate(manifest, { productId, topFolder: tmpExtractDir, versionHint: versionField });
    if (!manifestValidation.valid) {
      await rimraf(tmpExtractDir, { recursive: true, force: true }).catch(() => {});
      fs.unlinkSync(file.path);
      return res.status(400).json({ ok: false, error: "manifest_invalid", errors: manifestValidation.errors });
    }

    // 4) Security scan
    const security = securityValidator.scan(tmpExtractDir);
    if (!security.ok) {
      await rimraf(tmpExtractDir, { recursive: true, force: true }).catch(() => {});
      fs.unlinkSync(file.path);
      return res.status(400).json({ ok: false, error: "security_violation", reasons: security.reasons });
    }

    // 5) Move uploaded zip to permanent storage:
    const pluginSlug = manifest.id || productId;
    const version = manifest.version || versionField || "0.0.0";
    const destPath = path.join(storageDest, pluginSlug, version + ".zip");
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    moveFile(file.path, destPath);

    // 6) Create MarketplaceVersion & Submission via prisma
    // NOTE: prisma model names must match your schema
    const createdVersion = await prisma.marketplaceVersion.create({
      data: {
        productId: productId,
        version,
        manifestJson: manifest,
        archivePath: destPath,
        createdAt: new Date()
      }
    });

    const submission = await prisma.marketplaceSubmission.create({
      data: {
        productId: productId,
        versionId: createdVersion.id,
        status: "pending_review",
        createdAt: new Date()
      }
    });

    // 7) Done
    await rimraf(tmpExtractDir, { recursive: true, force: true }).catch(() => {});
    logger && logger.info && logger.info("marketplace: upload accepted", pluginSlug, version);

    return res.json({
      ok: true,
      message: "upload_accepted",
      versionId: createdVersion.id,
      submissionId: submission.id,
      manifest: manifest
    });
  } catch (err) {
    // try cleanup
    try { fs.unlinkSync(file.path); } catch(e){}
    try { await rimraf(tmpExtractDir, { recursive: true, force: true }); } catch(e){}
    logger && logger.error && logger.error("uploadVersion error", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

module.exports = { uploadVersion };
