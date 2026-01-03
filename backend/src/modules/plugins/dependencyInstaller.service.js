// src/modules/plugins/services/dependencyInstaller.service.js
// Secure dependency installer without shell injection

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function ensureDirSync(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

/**
 * Validate package name to prevent injection
 */
function isValidPackageName(name) {
  // Allow: @scope/package, package@version, package
  const pattern = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[a-z0-9-.]+)?$/i;
  return pattern.test(name);
}

/**
 * DependencyInstallerService
 * Secure npm/pnpm/yarn installation without shell injection
 */
const DependencyInstallerService = {
  /**
   * Install all declared dependencies for a plugin
   */
  async installAll(productId, manifest, destFolder, opts = {}) {
    if (!productId) throw new Error("installAll: productId required");
    if (!manifest) throw new Error("installAll: manifest required");
    if (!destFolder) throw new Error("installAll: destFolder required");

    const packageManager = (opts.packageManager || process.env.PLUGIN_PKG_MANAGER || 'npm').toLowerCase();
    const timeoutMs = opts.timeoutMs || 2 * 60 * 1000; // 2 minutes default
    const maxDeps = opts.maxDeps || 50; // Limit number of dependencies

    // Parse dependencies
    let deps = [];
    if (manifest.dependencies && Array.isArray(manifest.dependencies)) {
      deps = manifest.dependencies.slice(0, maxDeps);
    } else if (manifest.dependencies && typeof manifest.dependencies === 'object') {
      const entries = Object.entries(manifest.dependencies).slice(0, maxDeps);
      deps = entries.map(([k, v]) => `${k}@${v}`);
    } else if (manifest.require && Array.isArray(manifest.require)) {
      deps = manifest.require.slice(0, maxDeps);
    }

    // Validate all dependency names
    for (const dep of deps) {
      if (!isValidPackageName(dep)) {
        throw new Error(`Invalid dependency name: ${dep}`);
      }
    }

    if (deps.length === 0) {
      return { success: true, results: [] };
    }

    // Ensure package.json exists
    const packageJsonPath = path.join(destFolder, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      const pkg = {
        name: `plugin-${productId}`,
        version: manifest.version || '0.0.0',
        description: manifest.name || `plugin ${productId}`,
        private: true,
        dependencies: {}
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
    }

    // Build command without shell
    const cmdInfo = this._getCommandInfo(packageManager, deps);
    
    const results = [];
    
    try {
      const res = await this._executeInstall(
        cmdInfo.cmd, 
        cmdInfo.args, 
        destFolder, 
        timeoutMs
      );
      
      results.push({
        dependency: deps.join(','),
        success: res.code === 0,
        code: res.code,
        stdout: res.stdout,
        stderr: res.stderr
      });
      
      return { success: res.code === 0, results };
    } catch (err) {
      results.push({ 
        dependency: deps.join(','), 
        success: false, 
        error: err.message 
      });
      return { success: false, results };
    }
  },

  /**
   * Get command and args for package manager (no shell)
   */
  _getCommandInfo(packageManager, packages) {
    switch (packageManager) {
      case 'pnpm':
        return {
          cmd: 'pnpm',
          args: ['add', '--no-save-exact', ...packages]
        };
      
      case 'yarn':
        return {
          cmd: 'yarn',
          args: ['add', ...packages]
        };
      
      case 'npm':
      default:
        return {
          cmd: 'npm',
          args: ['install', '--no-audit', '--no-fund', '--legacy-peer-deps', ...packages]
        };
    }
  },

  /**
   * Execute installation safely without shell
   */
  _executeInstall(cmd, args, cwd, timeoutMs) {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, {
        cwd,
        shell: false, // CRITICAL: no shell, prevents injection
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Prevent npm from trying to use shell features
          npm_config_scripts_prepend_node_path: 'false'
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        
        // Force kill after 5 more seconds
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, timeoutMs);

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Spawn error: ${err.message}`));
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        
        if (timedOut) {
          return reject(new Error('Installation timed out'));
        }
        
        resolve({ code, stdout, stderr });
      });
    });
  },

  /**
   * Install a single dependency
   */
  async installOne(productId, depSpec, destFolder, opts = {}) {
    const fakeManifest = { 
      dependencies: Array.isArray(depSpec) ? depSpec : [depSpec] 
    };
    return this.installAll(productId, fakeManifest, destFolder, opts);
  }
};

module.exports = DependencyInstallerService;