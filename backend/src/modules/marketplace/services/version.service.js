// src/modules/marketplace/services/version.service.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const VersionStore = require('../stores/versionStore');
const ProductStore = require('../stores/productStore');
const SubmissionStore = require('../stores/submissionStore');
const AnalyticsService = require('./analytics.service'); // optional
const { AUTO_INSTALL_DEPENDENCIES } = process.env;

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Minimal manifest schema — extend as needed
const manifestSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    version: { type: 'string' },
    description: { type: 'string' },
    dependencies: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    scripts: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  required: ['id', 'name', 'version'],
  additionalProperties: true
};

const validateManifest = ajv.compile(manifestSchema);

/**
 * Helpers (pluggable)
 */
async function verifySignaturePlaceholder(archivePath, signature, publicKeyPem) {
  if (!signature || !publicKeyPem) return false;
  try {
    const buf = fs.readFileSync(archivePath);
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(buf);
    verifier.end();
    const sigBuf = Buffer.from(signature, 'base64');
    return verifier.verify(publicKeyPem, sigBuf);
  } catch (err) {
    return false;
  }
}

async function runStaticAnalysisPlaceholder(archivePath) {
  // Placeholder static analysis: return object with passed:true/false and issues[]
  return { passed: true, issues: [] };
}

async function installDependenciesIfAny(manifest, destFolder) {
  if (!manifest || !manifest.dependencies) return { installed: false, details: [] };
  if (!AUTO_INSTALL_DEPENDENCIES || AUTO_INSTALL_DEPENDENCIES === '0') {
    return { installed: false, details: ['AUTO_INSTALL_DEPENDENCIES not enabled'] };
  }

  const deps = manifest.dependencies || {};
  const pkg = { name: manifest.id || 'plugin-temp', version: manifest.version || '0.0.0', dependencies: deps };
  try {
    const pkgPath = path.join(destFolder, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    await new Promise((resolve, reject) => {
      exec('npm install --no-audit --no-fund', { cwd: destFolder, timeout: 5 * 60 * 1000 }, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve({ stdout, stderr });
      });
    });
    return { installed: true, details: ['npm install ran successfully'] };
  } catch (err) {
    return { installed: false, details: [String(err)] };
  }
}

/**
 * Core service
 */
const VersionService = {
  /**
   * Upload a new version.
   * Signature: uploadVersion(productId, sellerId, payload)
   *
   * payload: {
   *   version,
   *   changelog,
   *   archivePath,
   *   manifestJson,
   *   priceCents,
   *   currency,
   *   signature?,
   *   publicKeyPem?
   * }
   */
  async uploadVersion(productId, sellerId, payload) {
    if (!productId) throw new Error('productId required');
    if (!sellerId) throw new Error('sellerId required');
    if (!payload) throw new Error('payload required');

    const product = await ProductStore.findById(productId);
    if (!product) throw new Error('Product not found');

    // Basic ownership check — controller should also enforce sellerAuth
    if (product.sellerId !== sellerId) {
      throw new Error('Uploader is not the product owner');
    }

    // Manifest validation
    const manifest = payload.manifestJson || {};
    const valid = validateManifest(manifest);
    if (!valid) {
      const errors = (validateManifest.errors || []).map(e => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(`Manifest validation failed: ${errors}`);
    }

    // Signature verification (optional)
    if (payload.signature || payload.publicKeyPem) {
      const ok = await verifySignaturePlaceholder(payload.archivePath, payload.signature, payload.publicKeyPem);
      if (!ok) {
        throw new Error('Signature verification failed');
      }
    }

    // Static analysis / sandbox lint (optional)
    const analysis = await runStaticAnalysisPlaceholder(payload.archivePath);
    if (!analysis.passed) {
      // record failed version + submission for review
      const verFailed = await VersionStore.create({
        productId,
        version: payload.version,
        manifestJson: manifest,
        archivePath: payload.archivePath,
        changelog: payload.changelog,
        priceCents: payload.priceCents || 0,
        currency: payload.currency || 'USD'
      });

      await SubmissionStore.create({
        productId,
        versionId: verFailed.id,
        status: 'failed-analysis',
        notes: JSON.stringify(analysis.issues || [])
      });

      throw new Error('Static analysis failed — submission recorded for review');
    }

    // create DB record
    const version = await VersionStore.create({
      productId,
      version: payload.version,
      manifestJson: manifest,
      archivePath: payload.archivePath,
      changelog: payload.changelog,
      priceCents: payload.priceCents || 0,
      currency: payload.currency || 'USD'
    });

    // create pending submission for admin review/verification
    await SubmissionStore.create({
      productId,
      versionId: version.id,
      status: 'pending',
      reviewerId: null
    });

    // analytics event (optional)
    try {
      if (AnalyticsService && AnalyticsService.track) {
        AnalyticsService.track({
          productId,
          versionId: version.id,
          eventType: 'version.upload',
          meta: { uploadedBy: sellerId }
        }).catch(() => {});
      }
    } catch {}

    // Optionally install dependencies in a safe folder
    if (manifest && manifest.dependencies) {
      const tmpFolder = path.join(path.dirname(payload.archivePath), `installdir-${version.id}`);
      try {
        if (!fs.existsSync(tmpFolder)) fs.mkdirSync(tmpFolder, { recursive: true });
        await installDependenciesIfAny(manifest, tmpFolder);
      } catch (err) {
        // swallow install errors; don't break upload
      }
    }

    return version;
  },

  async listVersions(productId) {
    return VersionStore.listByProduct(productId);
  },

  async findLatest(productId) {
    return VersionStore.findLatest(productId);
  },

  async findLatestApproved(productId) {
    return VersionStore.findLatestApproved(productId);
  },

  async checkUpdatesForUser(productId, installedVersion) {
    const latest = await VersionStore.findLatest(productId);
    if (!latest) return { updateAvailable: false };
    const updateAvailable = latest.version !== installedVersion;
    return { updateAvailable, latest };
  },

  async findById(id) {
    return VersionStore.findById(id);
  }
};

module.exports = VersionService;
