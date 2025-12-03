const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { prisma } = require('../../../db/prisma'); // adjust if necessary
const { validate } = require('../validators/manifest.validator');
const fsUtil = require('../utils/fsUtil');
const DependencyInstaller = require('./dependencyInstaller.service');
const AnalyticsService = require('./analytics.service');
const WebhookEmitter = require('../utils/webhookEmitter'); // optional - may exist

const PLUGIN_ROOT = process.env.PLUGIN_ROOT || path.join(process.cwd(), 'plugins');
const TMP_ROOT = process.env.PLUGIN_TMP_ROOT || path.join(process.cwd(), 'uploads', 'tmp');

fsUtil.ensureDir(PLUGIN_ROOT);
fsUtil.ensureDir(TMP_ROOT);

async function computeSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * verifySignature: placeholder that checks a provided hex signature string equals archive hash.
 * You can replace with RSA/HMAC verification that uses seller public key.
 */
async function verifySignatureByHash(archivePath, signature) {
  if (!signature) return false;
  const computed = await computeSha256(archivePath);
  // Accept both hex or base64 forms; normalize to hex
  const sigHex = signature.length === 64 ? signature.toLowerCase() : null;
  if (sigHex) return computed === sigHex;
  return false;
}

const PluginInstaller = {
  /**
   * Install plugin from a previously-uploaded zip file on disk.
   * - archivePath: local path to zip
   * - opts: { signature } optional signature to verify
   * - returns created plugin DB record and installed path
   */
  async installFromArchive({ archivePath, signature = null, uploadedBy = null, autoInstallDeps = false }) {
    // 1) load zip and check manifest
    if (!fs.existsSync(archivePath)) throw new Error('Archive not found');

    const zip = new AdmZip(archivePath);
    const entries = zip.getEntries();

    const manifestEntry = entries.find(e => /manifest\.json$/i.test(e.entryName));
    if (!manifestEntry) throw new Error('manifest.json not found in ZIP');

    const manifestJson = JSON.parse(manifestEntry.getData().toString('utf8'));

    // 2) AJV validate manifest
    const ok = validate(manifestJson);
    if (!ok) {
      const errs = (validate.errors || []).map(e => `${e.instancePath} ${e.message}`).join('; ');
      throw new Error(`Manifest validation failed: ${errs}`);
    }

    // 3) signature verification (basic hash compare) - replace with real verification if required
    if (signature) {
      const sigOk = await verifySignatureByHash(archivePath, signature);
      if (!sigOk) throw new Error('Signature verification failed');
    }

    // 4) Decide plugin id and target path
    const pluginId = manifestJson.id;
    if (!pluginId) throw new Error('manifest.id required');
    const pluginTarget = path.join(PLUGIN_ROOT, pluginId);

    // 5) If already exists -> backup or versioning (we keep a backup)
    const backupDir = path.join(TMP_ROOT, `backup-${pluginId}-${Date.now()}`);
    if (fs.existsSync(pluginTarget)) {
      fsUtil.ensureDir(backupDir);
      // move existing folder to backup
      fs.renameSync(pluginTarget, path.join(backupDir, path.basename(pluginTarget)));
    }

    // ensure target
    fsUtil.ensureDir(pluginTarget);

    // 6) extract zip into target atomically (extract to temp then move)
    const extractTemp = path.join(TMP_ROOT, `extract-${pluginId}-${Date.now()}`);
    fsUtil.ensureDir(extractTemp);
    zip.extractAllTo(extractTemp, true);

    // move extracted contents to pluginTarget
    // if extractTemp contains a single folder, move its contents
    const items = fs.readdirSync(extractTemp);
    if (items.length === 1) {
      const single = path.join(extractTemp, items[0]);
      // move each child into pluginTarget
      const children = fs.readdirSync(single);
      for (const child of children) {
        const src = path.join(single, child);
        const dest = path.join(pluginTarget, child);
        fs.renameSync(src, dest);
      }
    } else {
      for (const item of items) {
        const src = path.join(extractTemp, item);
        const dest = path.join(pluginTarget, item);
        fs.renameSync(src, dest);
      }
    }

    // cleanup temp extraction
    await fsUtil.removeDirIfExistsAsync(extractTemp);

    // 7) Register plugin in DB (plugins table)
    const existing = await prisma.plugin.findUnique({ where: { id: pluginId } }).catch(() => null);
    const now = new Date();
    if (!existing) {
      await prisma.plugin.create({
        data: {
          id: pluginId,
          name: manifestJson.name || pluginId,
          version: manifestJson.version || '0.0.0',
          folder: pluginTarget,
          enabled: true,
          createdAt: now,
          updatedAt: now
        }
      });
    } else {
      await prisma.plugin.update({
        where: { id: pluginId },
        data: { version: manifestJson.version || existing.version, folder: pluginTarget, updatedAt: now }
      });
    }

    // 8) Optionally install dependencies
    if (autoInstallDeps && manifestJson.dependencies) {
      try {
        // spawn a worker or call dependency installer (synchronous)
        await DependencyInstaller.installDependencies(pluginId, manifestJson, pluginTarget);
      } catch (err) {
        // record analytics but do not block plugin registration
        await AnalyticsService.track({ productId: pluginId, eventType: 'dependency.install.failed', meta: { error: err.message } }).catch(()=>{});
      }
    }

    // 9) Analytics + webhook
    await AnalyticsService.track({ productId: pluginId, eventType: 'plugin.installed', meta: { installedBy: uploadedBy } }).catch(()=>{});
    try { WebhookEmitter && WebhookEmitter.emit('marketplace.plugin.installed', { pluginId, uploadedBy }); } catch(e){}

    // 10) try to reload plugin runtime (non-blocking)
    try {
      if (global.pluginEngine && typeof global.pluginEngine.reload === 'function') {
        // call but don't await long-running promise
        Promise.resolve().then(() => global.pluginEngine.reload().catch(()=>{}));
      }
    } catch (e) {}

    return { ok: true, pluginId, folder: pluginTarget };
  }
};

module.exports = PluginInstaller;
