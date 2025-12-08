/**
 * runtimeVerifier.service.js
 *
 * Runs a runtime smoke-test for a plugin version inside a worker thread.
 * Ensures proper `this` binding by using a class instead of an object literal.
 */

const path = require("path");
const fs = require("fs");
const { Worker } = require("worker_threads");
const os = require("os");

class RuntimeVerifierService {
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
      archiveUrl,
      pluginFolder,
      manifest,
      timeoutMs = Number(process.env.RUNTIME_VERIFY_TIMEOUT_MS || 5000)
    } = opts;

    // Properly bound method call
    const folder = await this._resolvePluginFolder({
      pluginFolder,
      archivePath,
      productId,
      versionId
    });

    if (!folder || !fs.existsSync(folder)) {
      throw new Error(
        "Plugin folder not found. Ensure extraction was successful and archiveExtractPath is valid."
      );
    }

    // Worker script location
    const workerFile = path.join(__dirname, "../workers/runtimeWorker.js");

    return new Promise((resolve, reject) => {
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
        try {
          worker.terminate?.();
        } catch (_) {}
      };

      const timer = setTimeout(() => {
        cleanUp();
        reject(new Error("Runtime verifier worker timed out"));
      }, Math.max(timeoutMs + 2000, 10000));

      worker.on("message", (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });

      worker.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          clearTimeout(timer);
          reject(new Error("Runtime verifier worker exited with code " + code));
        }
      });
    });
  }

  /**
   * Resolve plugin folder path
   */
  async _resolvePluginFolder({ pluginFolder, archivePath, productId, versionId }) {
    // Direct folder provided → best case
    if (pluginFolder) return pluginFolder;

    // If archivePath is ZIP, infer extraction folder
    if (archivePath && typeof archivePath === "string") {
      const candidate = archivePath.replace(/\.zip$/i, "");
      if (fs.existsSync(candidate) && fs.lstatSync(candidate).isDirectory()) {
        return candidate;
      }
    }

    // Last fallback — temp extraction
    const tmpBase = path.join(os.tmpdir(), "plugin-extracts");
    const guess = path.join(tmpBase, `${productId || "prod"}-${versionId || "ver"}`);
    if (fs.existsSync(guess) && fs.lstatSync(guess).isDirectory()) {
      return guess;
    }

    return null;
  }
}

// Export a singleton (same API as old object)
module.exports = new RuntimeVerifierService();
