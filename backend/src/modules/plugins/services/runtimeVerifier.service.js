/**
 * runtimeVerifier.service.js
 *
 * Runs a runtime smoke-test for a plugin version inside a worker thread.
 * This file is part of the plugin module and is imported directly by
 * Marketplace (modular-monolith) - no HTTP involved.
 *
 * Assumptions / contract:
 *  - The plugin archive has already been extracted by the PluginInstaller.
 *  - The extracted folder path is provided (pluginFolder) OR version.archiveExtractPath is set.
 *  - If only an archivePath is provided, the function will attempt to use archivePath.replace(/\.zip$/, '')
 *    as the extracted folder path. You should ensure extraction occurs during upload/upload worker.
 *
 * Security notes:
 *  - Worker thread isolates execution from main process.
 *  - Worker uses vm.Script with limited sandbox — still consider running workers in separate OS-level container for maximum safety.
 */

const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
const os = require('os');

const RuntimeVerifierService = {
  /**
   * Run runtime verification.
   * @param {Object} opts - { submissionId, productId, versionId, archivePath, pluginFolder, manifest, timeoutMs }
   * @returns {Promise<Object>} { passed: boolean, logs: string[], details: {} }
   */
  async run(opts = {}) {
    const {
      submissionId,
      productId,
      versionId,
      archivePath,
      archiveUrl, // not used in monolith mode, for future
      pluginFolder,
      manifest,
      timeoutMs = Number(process.env.RUNTIME_VERIFY_TIMEOUT_MS || 5000)
    } = opts;

    // resolve plugin folder
    const folder = await this._resolvePluginFolder({ pluginFolder, archivePath, productId, versionId });

    if (!folder || !fs.existsSync(folder)) {
      throw new Error('Plugin folder not found. Ensure PluginInstaller extracted the archive and set archiveExtractPath.');
    }

    // Worker script path (relative to this file)
    const workerFile = path.join(__dirname, '../workers/runtimeWorker.js');

    return new Promise((resolve, reject) => {
      // spawn worker
      const worker = new Worker(workerFile, {
        workerData: {
          folder,
          manifest,
          submissionId,
          productId,
          versionId,
          timeoutMs
        }
      });

      const cleanUp = () => {
        try { worker.terminate?.(); } catch (_) {}
      };

      const timer = setTimeout(() => {
        cleanUp();
        reject(new Error('Runtime verifier worker timed out'));
      }, Math.max(timeoutMs + 2000, 10000)); // small buffer beyond worker timeout

      worker.on('message', (msg) => {
        clearTimeout(timer);
        // expected msg: { passed: boolean, logs: [...], details: {...} }
        resolve(msg);
      });

      worker.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      worker.on('exit', (code) => {
        // worker may already have resolved; if not, treat non-zero as error
        if (code !== 0) {
          clearTimeout(timer);
          reject(new Error('Runtime verifier worker exited with code ' + code));
        }
      });
    });
  },

  async _resolvePluginFolder({ pluginFolder, archivePath, productId, versionId }) {
    // Preferred: explicit pluginFolder passed by caller
    if (pluginFolder) return pluginFolder;

    // Next: if archivePath is like /path/to/plugin-1.0.0.zip, assume extraction folder exists at /path/to/plugin-1.0.0/
    if (archivePath && typeof archivePath === 'string') {
      const candidate = archivePath.replace(/\.zip$/i, '');
      if (fs.existsSync(candidate) && fs.lstatSync(candidate).isDirectory()) return candidate;
    }

    // Last resort: check common extraction locations (project temp)
    const tmpBase = path.join(os.tmpdir(), 'plugin-extracts');
    const guess = path.join(tmpBase, `${productId || 'prod'}-${versionId || 'ver'}`);
    if (fs.existsSync(guess) && fs.lstatSync(guess).isDirectory()) return guess;

    return null;
  }
};

module.exports = RuntimeVerifierService;
