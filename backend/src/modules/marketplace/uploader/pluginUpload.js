const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const os = require("os");
const AdmZip = require("adm-zip");
const Ajv = require("ajv");
const manifestSchema = require("./manifest.schema.json");
const openpgp = require("openpgp");

const ajv = new Ajv({ allErrors: true, strict: false });
const validateManifest = ajv.compile(manifestSchema);

const PLUGINS_DIR = process.env.PLUGINS_DIR || path.join(process.cwd(), "plugins");

/**
 * Multer temp storage (disk)
 */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => {
      const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "-")}`;
      cb(null, safe);
    }
  }),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB default, adjust as needed
  }
});

/**
 * Verify PGP signature if public key provided and sig entry present
 * manifestText: string; signatureText: string (armored)
 */
async function verifySignature(manifestText, signatureArmored, publicKeyArmored) {
  if (!publicKeyArmored) return { ok: true, reason: "no public key provided" };
  try {
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
    const message = await openpgp.createMessage({ text: manifestText });
    const signature = await openpgp.readSignature({ armoredSignature: signatureArmored });
    const verificationResult = await openpgp.verify({
      message,
      signature,
      verificationKeys: publicKey
    });
    const { verified } = verificationResult.signatures[0];
    await verified(); // throws if invalid
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * Inspect ZIP, extract manifest.json, optional manifest.json.sig
 * Does not execute any plugin code.
 * Returns: { manifest: object, signature?: string, zipPath: '/tmp/..' }
 */
async function inspectZip(zipFilePath) {
  const zip = new AdmZip(zipFilePath);
  const entries = zip.getEntries();

  // Prefer manifest.json at root; also accept manifest.json in top-level folder
  const manifestEntry = entries.find(e => {
    const n = e.entryName.replace(/^\/+/, "");
    return n === "manifest.json" || n.endsWith("/manifest.json");
  });

  if (!manifestEntry) {
    throw new Error("manifest.json not found in plugin ZIP (root or top-level folder).");
  }

  const manifestText = manifestEntry.getData().toString("utf8");
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch (err) {
    throw new Error("Invalid JSON in manifest.json: " + err.message);
  }

  // Signature (optional)
  const sigEntry = entries.find(e => {
    const n = e.entryName.replace(/^\/+/, "");
    return n === "manifest.json.sig" || n.endsWith("/manifest.json.sig") || n === "manifest.sig" || n.endsWith("/manifest.sig");
  });

  const signatureArmored = sigEntry ? sigEntry.getData().toString("utf8") : null;

  return { manifest, manifestText, signatureArmored, zipPath: zipFilePath, zip: zip };
}

/**
 * Persist zip into plugins dir under productId/version (safe)
 * - ensures directories
 * - write zip file to <PLUGINS_DIR>/<productId>/<version>/package.zip
 * - optionally extract (we DO NOT execute code)
 */
async function persistPluginZip(productId, version, tempZipPath) {
  const destDir = path.join(PLUGINS_DIR, productId, version);
  await fs.mkdir(destDir, { recursive: true });
  const fileName = "package.zip";
  const destPath = path.join(destDir, fileName);
  await fs.copyFile(tempZipPath, destPath);
  // optionally extract to folder next to zip (we keep archived zip as source-of-truth)
  // const zip = new AdmZip(destPath);
  // zip.extractAllTo(destDir, true);
  return { destPath, destDir };
}

module.exports = {
  uploadMiddleware: upload.single("file"), // upload field name: file
  validateManifestAJV: validateManifest,
  inspectZip,
  verifySignature,
  persistPluginZip
};
