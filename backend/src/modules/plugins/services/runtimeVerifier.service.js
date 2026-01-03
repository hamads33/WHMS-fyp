// src/modules/plugins/services/runtimeVerifier.service.js
// Secure runtime verification with worker threads

const path = require("path");
const fs = require("fs");
const { Worker } = require("worker_threads");
const os = require("os");

class RuntimeVerifierService {
  /**
   * Run runtime verification for a plugin
   */
  async run(opts = {}) {
    const {
      submissionId,
      productId,
      versionId,
      archivePath,
      pluginFolder,
      manifest,
      timeoutMs = Number(process.env.RUNTIME_VERIFY_TIMEOUT_MS || 5000)
    } = opts;

    // Resolve plugin folder
    const folder = await this._resolvePluginFolder({
      pluginFolder,
      archivePath,
      productId,
      versionId
    });

    if (!folder || !fs.existsSync(folder)) {
      throw new Error(
        "Plugin folder not found. Ensure extraction was successful."
      );
    }

    const workerFile = path.join(__dirname, "../workers/runtimeWorker.js");

    if (!fs.existsSync(workerFile)) {
      throw new Error(`Worker script not found: ${workerFile}`);
    }

    return new Promise((resolve, reject) => {
      let worker;

      try {
        worker = new Worker(workerFile, {
          workerData: {
            folder,
            manifest,
            submissionId,
            productId,
            versionId,
            timeoutMs
          }
        });
      } catch (err) {
        return reject(new Error(`Failed to create worker: ${err.message}`));
      }

      const cleanup = () => {
        try {
          if (worker) {
            worker.terminate();
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      };

      // Overall timeout (worker timeout + buffer)
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Runtime verifier worker timed out"));
      }, Math.max(timeoutMs + 2000, 10000));

      worker.on("message", (msg) => {
        clearTimeout(timer);
        cleanup();
        resolve(msg);
      });

      worker.on("error", (err) => {
        clearTimeout(timer);
        cleanup();
        reject(new Error(`Worker error: ${err.message}`));
      });

      worker.on("exit", (code) => {
        clearTimeout(timer);
        cleanup();
        
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Resolve plugin folder path
   */
  async _resolvePluginFolder({ pluginFolder, archivePath, productId, versionId }) {
    // Direct folder provided
    if (pluginFolder) {
      if (fs.existsSync(pluginFolder)) {
        return pluginFolder;
      }
    }

    // Infer from archive path
    if (archivePath && typeof archivePath === "string") {
      const candidate = archivePath.replace(/\.zip$/i, "");
      
      if (fs.existsSync(candidate)) {
        const stats = fs.statSync(candidate);
        if (stats.isDirectory()) {
          return candidate;
        }
      }
    }

    // Fallback to temp extraction folder
    const tmpBase = path.join(os.tmpdir(), "plugin-extracts");
    const guess = path.join(
      tmpBase,
      `${productId || "prod"}-${versionId || "ver"}`
    );

    if (fs.existsSync(guess)) {
      const stats = fs.statSync(guess);
      if (stats.isDirectory()) {
        return guess;
      }
    }

    return null;
  }
}

// Export singleton
module.exports = new RuntimeVerifierService();