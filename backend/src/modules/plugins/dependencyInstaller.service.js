// src/modules/plugins/dependencyInstaller.service.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/**
 * DependencyInstallerService
 *
 * - Reads manifest.dependencies (expected shape: { "<pkg>": "<range>" } or ["pkg@version"])
 * - Runs the configured package manager (npm / pnpm / yarn) inside target folder
 * - Returns array of results { dependency, success, code, stdout, stderr }
 *
 * IMPORTANT: this performs real installs (child processes). Marketplace must
 * run this from a trusted environment (worker or admin action).
 */
const DependencyInstallerService = {
  /**
   * Install all declared dependencies for a plugin.
   * @param {String} productId
   * @param {Object|Array} manifest - manifest json parsed
   * @param {String} destFolder - path to installed plugin version folder
   * @param {Object} opts - { packageManager: "npm"|"pnpm"|"yarn", dev: false, timeoutMs }
   * @returns {Promise<{results: Array, success: boolean}>}
   */
  installAll: async function (productId, manifest, destFolder, opts = {}) {
    if (!productId) throw new Error("installAll: productId required");
    if (!manifest) throw new Error("installAll: manifest required");
    if (!destFolder) throw new Error("installAll: destFolder required");

    const packageManager = (opts.packageManager || process.env.PLUGIN_PKG_MANAGER || 'npm').toLowerCase();
    const timeoutMs = opts.timeoutMs || 2 * 60 * 1000; // default 2 minutes

    // Determine dependencies list
    let deps = [];
    if (manifest.dependencies && Array.isArray(manifest.dependencies)) {
      deps = manifest.dependencies.slice();
    } else if (manifest.dependencies && typeof manifest.dependencies === 'object') {
      // object form { name: version }
      deps = Object.entries(manifest.dependencies).map(([k, v]) => `${k}@${v}`);
    } else if (manifest.require && Array.isArray(manifest.require)) {
      deps = manifest.require.slice();
    }

    // nothing to do
    if (deps.length === 0) return { success: true, results: [] };

    // If package.json not present, create minimal package.json so npm installs work
    const packageJsonPath = path.join(destFolder, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      const pkg = {
        name: `plugin-${productId}`,
        version: manifest.version || '0.0.0',
        description: manifest.name || `plugin ${productId}`,
        private: true,
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
    }

    // Build install command depending on package manager
    const cmdInfo = (pm, packages) => {
      if (pm === 'pnpm') return { cmd: 'pnpm', args: ['add', ...packages] };
      if (pm === 'yarn') return { cmd: 'yarn', args: ['add', ...packages] };
      // default npm
      return { cmd: 'npm', args: ['install', '--no-audit', '--no-fund', ...packages] };
    };

    const results = [];
    // run a single install for all packages (faster)
    const { cmd, args } = cmdInfo(packageManager, deps);

    const execPromise = () =>
      new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
          cwd: destFolder,
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: Object.assign({}, process.env),
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (d) => (stdout += d.toString()));
        child.stderr.on('data', (d) => (stderr += d.toString()));

        let timedOut = false;
        const to = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
        }, timeoutMs);

        child.on('error', (err) => {
          clearTimeout(to);
          reject(err);
        });

        child.on('close', (code) => {
          clearTimeout(to);
          if (timedOut) return reject(new Error('installAll: package manager timed out'));
          return resolve({ code, stdout, stderr });
        });
      });

    try {
      const res = await execPromise();
      results.push({
        dependency: deps.join(','),
        success: res.code === 0,
        code: res.code,
        stdout: res.stdout,
        stderr: res.stderr,
      });
      return { success: res.code === 0, results };
    } catch (err) {
      results.push({ dependency: deps.join(','), success: false, error: err.message });
      return { success: false, results };
    }
  },

  /**
   * Convenience: install a single dependency (wraps installAll)
   */
  installOne: async function (productId, depSpec, destFolder, opts = {}) {
    const fakeManifest = { dependencies: Array.isArray(depSpec) ? depSpec : [depSpec] };
    return this.installAll(productId, fakeManifest, destFolder, opts);
  },
};

module.exports = DependencyInstallerService;
