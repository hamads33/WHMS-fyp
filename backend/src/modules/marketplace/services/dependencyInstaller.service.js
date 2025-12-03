/**
 * dependencyInstaller.service.js
 *
 * Production-grade Dependency Installer for Marketplace plugins.
 *
 * Responsibilities:
 *  - Read manifest.dependencies and install different types:
 *      - npm: installs npm packages into plugin folder (writes package.json stub)
 *      - wasm: downloads .wasm assets to plugin wasm folder
 *      - sdk: proxy logic for 3rd-party SDKs (pluggable registry)
 *  - Use BuildLogService to stream logs
 *  - Return structured result with success/failure per dependency
 *
 * SECURITY NOTE:
 *  Running "npm install" on the app host is a security risk. In production
 *  you MUST offload installs to a worker / docker container with restricted
 *  network and filesystem access. This implementation uses child_process.exec
 *  for convenience and demonstration; adapt for your infra.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const fetch = require('node-fetch'); // ensure node-fetch in package.json
const BuildLogService = require('./buildLog.service');
const AnalyticsService = require('./analytics.service');

const execAsync = promisify(exec);

const DependencyInstaller = {
  /**
   * Install all dependencies declared in manifest into plugin folder.
   * @param {String} pluginId - plugin id (manifest.id)
   * @param {Object} manifest - parsed manifest JSON
   * @param {String} destFolder - absolute path where plugin was extracted
   * @param {Object} opts - { timeoutMs, allowUnsafeNpm, submissionId, productId, versionId }
   */
  async installAll(pluginId, manifest, destFolder, opts = {}) {
    const submissionId = opts.submissionId || null;
    const productId = opts.productId || pluginId;
    const versionId = opts.versionId || null;
    const timeoutMs = opts.timeoutMs || 5 * 60 * 1000; // 5 minutes default

    const results = {
      npm: [],
      wasm: [],
      sdk: [],
      errors: []
    };

    // helper to append build log
    const appendLog = async (level, step, message, meta) => {
      try {
        await BuildLogService.append({
          submissionId,
          productId,
          versionId,
          level,
          step,
          message,
          meta
        });
      } catch (e) {
        console.error('[DependencyInstaller] Failed to write build log', e.message);
      }
    };

    await appendLog('info', 'dep.install.start', `Starting dependency installation`, manifest);

    try {
      // 1) NPM dependencies
      if (manifest.dependencies && manifest.dependencies.npm && manifest.dependencies.npm.length) {
        const packages = manifest.dependencies.npm; // e.g. ["axios@^1.5.0","uuid"]
        await appendLog('info', 'dep.npm.prepare', `Installing npm deps: ${packages.join(', ')}`);

        // prepare package.json minimal
        const pkg = {
          name: manifest.id || pluginId,
          version: manifest.version || '0.0.0',
          private: true,
          dependencies: {}
        };

        // put dependencies into package.json (we'll rely on npm install <pkg> instead of writing versions)
        const pkgPath = path.join(destFolder, 'package.json');
        try {
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        } catch (e) {
          await appendLog('error', 'dep.npm.pkgwrite', `Failed to write package.json: ${e.message}`);
          results.errors.push({ type: 'npm', message: e.message });
        }

        // run npm install for listed packages individually (safer) or full install
        try {
          // NOTE: to reduce attack surface you could run 'npm ci' against a locked shrinkwrap made by your CI
          const installCmd = `npm install --no-audit --no-fund ${packages.join(' ')}`;
          await appendLog('info', 'dep.npm.exec', `Running: ${installCmd}`);
          const { stdout, stderr } = await execAsync(installCmd, { cwd: destFolder, timeout: timeoutMs });
          await appendLog('info', 'dep.npm.result', `npm stdout: ${stdout.slice(0, 2000)}`, { stderr: stderr && stderr.slice(0,2000) });
          results.npm.push({ success: true, details: stdout });
          await AnalyticsService.track({ productId, versionId, eventType: 'dependency.install.success', meta: { pluginId, packages } }).catch(()=>{});
        } catch (e) {
          await appendLog('error', 'dep.npm.failed', `npm install failed: ${e.message}`, { stack: e.stack });
          results.npm.push({ success: false, error: e.message });
          results.errors.push({ type: 'npm', message: e.message });
          await AnalyticsService.track({ productId, versionId, eventType: 'dependency.install.failed', meta: { pluginId, packages, error: e.message } }).catch(()=>{});
        }
      }

      // 2) WASM dependencies: download each entry to plugin's wasm folder
      if (manifest.dependencies && manifest.dependencies.wasm && manifest.dependencies.wasm.length) {
        const wasmDir = path.join(destFolder, 'wasm');
        if (!fs.existsSync(wasmDir)) fs.mkdirSync(wasmDir, { recursive: true });
        for (const wasmUrl of manifest.dependencies.wasm) {
          try {
            await appendLog('info', 'dep.wasm.download', `Downloading ${wasmUrl}`);
            const res = await fetch(wasmUrl, { timeout: timeoutMs });
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${wasmUrl}`);
            const buf = await res.buffer();
            const name = path.basename(new URL(wasmUrl).pathname);
            const dst = path.join(wasmDir, name);
            fs.writeFileSync(dst, buf);
            await appendLog('info', 'dep.wasm.saved', `Saved wasm to ${dst}`);
            results.wasm.push({ url: wasmUrl, path: dst, success: true });
            await AnalyticsService.track({ productId, versionId, eventType: 'dependency.wasm.download', meta: { pluginId, wasmUrl } }).catch(()=>{});
          } catch (e) {
            await appendLog('error', 'dep.wasm.failed', `WASM download failed ${wasmUrl}: ${e.message}`);
            results.wasm.push({ url: wasmUrl, success: false, error: e.message });
            results.errors.push({ type: 'wasm', url: wasmUrl, message: e.message });
          }
        }
      }

      // 3) SDK dependencies - custom logic: support "registry:package@version" format
      if (manifest.dependencies && manifest.dependencies.sdk && manifest.dependencies.sdk.length) {
        for (const sdkEntry of manifest.dependencies.sdk) {
          try {
            await appendLog('info', 'dep.sdk.resolve', `Resolving SDK ${sdkEntry}`);
            // For illustration, we support "npm:" or "http:" prefixes; otherwise use custom registry adapter
            if (sdkEntry.startsWith('npm:')) {
              // npm style - reuse npm install
              const pkgName = sdkEntry.replace(/^npm:/,'');
              const installCmd = `npm install --no-audit --no-fund ${pkgName}`;
              await appendLog('info', 'dep.sdk.npm', `Running ${installCmd}`);
              const { stdout } = await execAsync(installCmd, { cwd: destFolder, timeout: timeoutMs });
              await appendLog('info', 'dep.sdk.npm.ok', stdout.slice(0,2000));
              results.sdk.push({ sdk: sdkEntry, success: true });
            } else if (sdkEntry.startsWith('http://') || sdkEntry.startsWith('https://')) {
              // remote tarball: download & extract (not fully implemented here)
              await appendLog('warn', 'dep.sdk.remote', `Remote SDK download not fully supported in-core. Entry: ${sdkEntry}`);
              results.sdk.push({ sdk: sdkEntry, success: false, warning: 'manual handling required' });
            } else {
              // custom registries: call registered adapter (placeholder)
              await appendLog('warn', 'dep.sdk.custom', `Custom SDK adapter required for ${sdkEntry}`);
              results.sdk.push({ sdk: sdkEntry, success: false, warning: 'adapter missing' });
            }
          } catch (e) {
            await appendLog('error', 'dep.sdk.failed', `${sdkEntry} failed: ${e.message}`);
            results.sdk.push({ sdk: sdkEntry, success: false, error: e.message });
            results.errors.push({ type: 'sdk', sdk: sdkEntry, message: e.message });
          }
        }
      }

      await appendLog('info', 'dep.install.complete', 'Dependency installation finished', results);
      return results;
    } catch (err) {
      await appendLog('error', 'dep.install.crash', `Unexpected error: ${err.message}`, { stack: err.stack });
      results.errors.push({ type: 'fatal', message: err.message });
      return results;
    }
  }
};

module.exports = DependencyInstaller;
