// src/modules/marketplace/http/controllers/upload.controller.js
const fs = require("fs");
const path = require("path");
const util = require("util");
const rimraf = util.promisify(require("fs").rm);
const semver = require("semver");

const { extractZipToDir } = require("../../utils/extractZip");
const manifestValidator = require("../../services/manifestValidator");
const securityValidator = require("../../services/securityValidator");

const moveFile = (src, dest) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
};

/**
 * Find manifest.json anywhere inside extracted directory
 */
function findManifestFile(rootDir) {
  let found = null;

  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);

      if (item.isDirectory()) {
        walk(full);
      } else if (item.isFile()) {
        const name = item.name.toLowerCase();
        if (name === "manifest" || name === "manifest.json") {
          found = full;
          return;
        }
      }
    }
  }

  walk(rootDir);
  return found;
}

async function uploadVersion(req, res) {
  const { prisma, logger, uploadsTmp, storageDest } = req.ctx || {};
  const file = req.file;
  const productId = req.params.productId;
  const versionField = req.body.version;

  if (!file)
    return res.status(400).json({ ok: false, error: "missing_file" });

  if (!productId)
    return res.status(400).json({ ok: false, error: "missing_productId" });

  const tmpExtractDir = path.join(
    uploadsTmp,
    `mpk_${Date.now()}_${Math.round(Math.random() * 9999)}`
  );

  try {
    // ---------------------------------------------------------
    // 1) Extract ZIP
    // ---------------------------------------------------------
    const extracted = extractZipToDir(file.path, tmpExtractDir);
    if (!extracted) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      return res.status(400).json({ ok: false, error: "zip_extract_failed" });
    }

    // ---------------------------------------------------------
    // 2) Find & Load Manifest
    // ---------------------------------------------------------
    const manifestPath = findManifestFile(tmpExtractDir);

    if (!manifestPath) {
      await rimraf(tmpExtractDir, { recursive: true, force: true });
      try { fs.unlinkSync(file.path); } catch (_) {}
      return res.status(400).json({ ok: false, error: "manifest_missing" });
    }

    let manifest;
    try {
      const raw = fs.readFileSync(manifestPath, "utf8");
      manifest = JSON.parse(raw);
    } catch (e) {
      await rimraf(tmpExtractDir, { recursive: true, force: true });
      try { fs.unlinkSync(file.path); } catch (_) {}
      return res.status(400).json({
        ok: false,
        error: "manifest_json_invalid",
        details: e.message,
        file: manifestPath
      });
    }

    // ---------------------------------------------------------
    // 3) Validate Manifest Schema
    // ---------------------------------------------------------
    const manifestValidation = manifestValidator.validate(manifest);
    if (!manifestValidation.valid) {
      await rimraf(tmpExtractDir, { recursive: true, force: true });
      try { fs.unlinkSync(file.path); } catch (_) {}
      return res.status(400).json({
        ok: false,
        error: "manifest_invalid",
        errors: manifestValidation.errors,
        warnings: manifestValidation.warnings
      });
    }

    // ---------------------------------------------------------
    // 4) Resolve Version
    // ---------------------------------------------------------
    const versionStr = manifest.version || versionField;
    if (!versionStr) {
      await rimraf(tmpExtractDir, { recursive: true, force: true });
      try { fs.unlinkSync(file.path); } catch (_) {}
      return res.status(400).json({ ok: false, error: "version_missing" });
    }

    if (!semver.valid(versionStr)) {
      await rimraf(tmpExtractDir, { recursive: true, force: true });
      try { fs.unlinkSync(file.path); } catch (_) {}
      return res.status(400).json({
        ok: false,
        error: "version_not_semver",
        version: versionStr
      });
    }

    // ---------------------------------------------------------
    // 5) Security Scan
    // ---------------------------------------------------------
    const security = securityValidator.scan(tmpExtractDir);
    if (!security.ok) {
      // Persist rejected version + submission
      try {
        const pluginSlug = manifest.id || productId;
        const destPath = path.join(storageDest, pluginSlug, versionStr + ".zip");
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        moveFile(file.path, destPath);

        const createdVersion = await prisma.marketplaceVersion.create({
          data: {
            productId,
            version: versionStr,
            manifestJson: manifest,
            archivePath: destPath,
            
            createdAt: new Date()
          }
        });

        const submission = await prisma.marketplaceSubmission.create({
          data: {
            productId,
            versionId: createdVersion.id,
            status: "auto_rejected",
            notes: JSON.stringify({ security_reasons: security.reasons }),
            createdAt: new Date()
          }
        });

        await rimraf(tmpExtractDir, { recursive: true, force: true });
        logger?.warn?.("upload auto-rejected (security)", productId, security.reasons);

        return res.status(200).json({
          ok: true,
          message: "upload_auto_rejected_security",
          submissionId: submission.id,
          reasons: security.reasons
        });
      } catch (e) {
        logger?.error?.("uploadVersion auto-reject persist failed", e);
        return res.status(500).json({ ok: false, error: "persist_failed", details: e.message });
      }
    }

    // ---------------------------------------------------------
    // 6) Prevent Duplicate Versions
    // ---------------------------------------------------------
    const existingVersions = await prisma.marketplaceVersion.findMany({
      where: { productId },
      select: { version: true }
    });

    const existingSemvers = existingVersions
      .map(v => v.version)
      .filter(v => semver.valid(v));

    if (existingSemvers.includes(versionStr)) {
      const highest = existingSemvers.sort((a, b) => semver.rcompare(a, b))[0];
      const suggested = semver.inc(highest, "patch");

      await rimraf(tmpExtractDir, { recursive: true, force: true });
      try { fs.unlinkSync(file.path); } catch (_) {}

      return res.status(409).json({
        ok: false,
        error: "version_exists",
        version: versionStr,
        suggestion: suggested
      });
    }

    if (existingSemvers.length > 0) {
      const latest = existingSemvers.sort((a, b) => semver.rcompare(a, b))[0];

      if (semver.lt(versionStr, latest)) {
        const suggested = semver.inc(latest, "patch");

        await rimraf(tmpExtractDir, { recursive: true, force: true });
        try { fs.unlinkSync(file.path); } catch (_) {}

        return res.status(409).json({
          ok: false,
          error: "version_lower_than_existing",
          version: versionStr,
          latest,
          suggestion: suggested
        });
      }
    }

    // ---------------------------------------------------------
    // 7) Store ZIP Permanently
    // ---------------------------------------------------------
    const pluginSlug = manifest.id || productId;
    const destPath = path.join(storageDest, pluginSlug, versionStr + ".zip");
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    moveFile(file.path, destPath);

    // ---------------------------------------------------------
    // 8) Create MarketplaceVersion
    // ---------------------------------------------------------
  const createdVersion = await prisma.marketplaceVersion.create({
  data: {
    productId,
    version: versionStr,
    manifestJson: manifest,
    archivePath: destPath,

    // REQUIRED FIELDS
    priceCents: 0,          // default plugin price
    currency: "USD",        // optional, but recommended

    createdAt: new Date()
  }
});


    // ---------------------------------------------------------
    // 9) Persist Declared Dependencies
    // ---------------------------------------------------------
    if (manifest.dependencies && typeof manifest.dependencies === "object") {
      for (const [depId, range] of Object.entries(manifest.dependencies)) {
        await prisma.marketplaceDependency.create({
          data: {
            productId,
            dependencyId: depId,
            versionRange: range,
            approved: false,
            createdAt: new Date()
          }
        });
      }
    }

    // ---------------------------------------------------------
    // 10) Create Pending Submission
    // ---------------------------------------------------------
    const submission = await prisma.marketplaceSubmission.create({
      data: {
        productId,
        versionId: createdVersion.id,
        status: "pending_review",
        createdAt: new Date()
      }
    });

    // ---------------------------------------------------------
    // 11) Cleanup
    // ---------------------------------------------------------
    await rimraf(tmpExtractDir, { recursive: true, force: true });

    logger?.info?.("marketplace: upload accepted", pluginSlug, versionStr);

    return res.json({
      ok: true,
      message: "upload_accepted",
      versionId: createdVersion.id,
      submissionId: submission.id,
      manifest
    });
  } catch (err) {
    try { fs.unlinkSync(file.path); } catch (_) {}
    try { await rimraf(tmpExtractDir, { recursive: true, force: true }); } catch (_) {}

    logger?.error?.("uploadVersion error", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

module.exports = { uploadVersion };
