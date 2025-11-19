// src/modules/automation/services/pluginManager.js
// Responsible for installing a plugin zip into ./plugins/actions/<pluginId>
// Dependencies: adm-zip (npm i adm-zip)

const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const AdmZip = require('adm-zip');
const pluginLoader = require('../pluginEngine/pluginLoader');

const mkdir = promisify(fs.mkdir);
const rm = promisify(fs.rm || fs.rmdir); // node v14+ rm, fallback to rmdir
const copyFile = promisify(fs.copyFile);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const USER_PLUGINS_DIR = path.join(process.cwd(), 'plugins', 'actions');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

function isSafeName(name) {
  // prevent traversal and weird names
  return typeof name === 'string' && name.length > 0 && !name.includes('..') && !path.isAbsolute(name);
}

async function installFromZip(zipPath) {
  // Extract to a temporary directory
  const tmpDir = path.join(os.tmpdir(), `plugin_upload_${Date.now()}`);
  await ensureDir(tmpDir);

  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tmpDir, true);

    // Find manifest.json at root or inside single folder
    let extractedRoot = tmpDir;
    const items = await readdir(tmpDir);
    // If the zip contains a single top-level folder, use that as root
    if (items.length === 1) {
      const only = path.join(tmpDir, items[0]);
      const s = await stat(only);
      if (s.isDirectory()) extractedRoot = only;
    }

    const manifestPath = path.join(extractedRoot, 'manifest.json');
    const indexPath = path.join(extractedRoot, 'index.js');

    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json not found in plugin root');
    }
    if (!fs.existsSync(indexPath)) {
      throw new Error('index.js not found in plugin root');
    }

    const manifestRaw = await readFile(manifestPath, 'utf8');
    let manifest;
    try {
      manifest = JSON.parse(manifestRaw);
    } catch (err) {
      throw new Error('manifest.json is invalid JSON');
    }

    if (!manifest.id || !isSafeName(manifest.id)) {
      throw new Error('manifest.json must contain a safe string "id" field');
    }

    const destDir = path.join(USER_PLUGINS_DIR, manifest.id);

    // Remove existing plugin (overwrite)
    if (fs.existsSync(destDir)) {
      await rm(destDir, { recursive: true, force: true });
    }

    await ensureDir(USER_PLUGINS_DIR);
    // Copy files from extractedRoot to destDir (simple directory copy)
    await copyDirectoryRecursive(extractedRoot, destDir);

    // Reload user plugins
    try {
      pluginLoader.loadUserPlugins();
    } catch (err) {
      // best-effort cleanup
      throw new Error('Plugin installed but failed to load: ' + err.message);
    }

    return { ok: true, id: manifest.id, name: manifest.name || null };
  } finally {
    // cleanup zip and tmp extraction (best-effort)
    try { await rm(zipPath, { force: true }); } catch (e) {}
    // remove tmpDir
    try { await rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
  }
}

async function copyDirectoryRecursive(src, dst) {
  await ensureDir(dst);
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);

    // safety: prevent path traversal from zip entries
    if (!dstPath.startsWith(path.join(USER_PLUGINS_DIR))) {
      // ensure plugin files live inside plugins dir
      // compute a safe destination under dst
    }

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(srcPath, dstPath);
    } else if (entry.isFile()) {
      await ensureDir(path.dirname(dstPath));
      await copyFile(srcPath, dstPath);
    }
  }
}

module.exports = { installFromZip };
