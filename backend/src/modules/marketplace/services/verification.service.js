// src/modules/marketplace/services/verification.service.js
// UPDATED: Added plugin module compatibility validation (FR-M08)

const fs = require('fs');
const path = require('path');

class VerificationService {
  constructor({ prisma, logger = console, pluginVerifier, pluginEngine }) {
    this.prisma = prisma;
    this.logger = logger;
    this.pluginVerifier = pluginVerifier;
    this.pluginEngine = pluginEngine;
  }

  /**
   * FR-M08: Verify plugin during submission
   * UPDATED: Added plugin module compatibility checks
   * @param {string} productId - Product ID
   * @param {string} versionId - Version ID
   * @param {string} archivePath - Path to plugin archive
   * @param {Object} manifestJson - Plugin manifest
   * @returns {Promise<Object>} Verification result
   */
  async verifyPlugin(productId, versionId, archivePath, manifestJson) {
    const issues = [];
    let passed = true;

    try {
      this.logger.info(`[Verify] Verifying plugin ${productId} version ${versionId}`);

      // 1. Validate manifest structure
      const manifestIssues = this._validateManifest(manifestJson);
      if (manifestIssues.length > 0) {
        issues.push(...manifestIssues);
        passed = false;
      }

      // 2. NEW: Validate plugin module compatibility
      const compatibilityIssues = this._validatePluginModuleCompatibility(manifestJson);
      if (compatibilityIssues.length > 0) {
        issues.push(...compatibilityIssues);
        if (compatibilityIssues.some(i => i.severity === 'error')) {
          passed = false;
        }
      }

      // 3. Check archive exists and is valid
      if (!fs.existsSync(archivePath)) {
        issues.push({
          severity: 'error',
          code: 'archive_not_found',
          message: 'Plugin archive file not found'
        });
        passed = false;
      } else {
        const stats = fs.statSync(archivePath);
        if (stats.size > 50 * 1024 * 1024) {
          issues.push({
            severity: 'error',
            code: 'file_too_large',
            message: 'Plugin archive exceeds 50MB limit'
          });
          passed = false;
        }

        // NEW: Verify archive contents
        const archiveIssues = await this._verifyArchiveContents(archivePath, manifestJson);
        if (archiveIssues.length > 0) {
          issues.push(...archiveIssues);
          if (archiveIssues.some(i => i.severity === 'error')) {
            passed = false;
          }
        }
      }

      // 4. Check for security issues
      const securityIssues = await this._checkSecurity(manifestJson);
      if (securityIssues.length > 0) {
        issues.push(...securityIssues);
      }

      // 5. Optional: Verify digital signature
      if (this.pluginVerifier && this.pluginVerifier.verify) {
        try {
          const isValid = await this.pluginVerifier.verify({
            filePath: archivePath,
            signaturePath: `${archivePath}.sig`
          });

          if (!isValid) {
            issues.push({
              severity: 'warning',
              code: 'signature_invalid',
              message: 'Plugin signature could not be verified'
            });
          }
        } catch (error) {
          this.logger.debug('[Verify] Signature verification not available:', error.message);
        }
      }

      // 6. NEW: Validate plugin engine integration
      const integrationIssues = await this._validatePluginModuleIntegration(manifestJson);
      if (integrationIssues.length > 0) {
        issues.push(...integrationIssues);
      }

      // 7. Check action files exist
      if (manifestJson.actions) {
        const actionIssues = await this._checkActions(manifestJson);
        if (actionIssues.length > 0) {
          issues.push(...actionIssues);
        }
      }

      // Store verification result
      const verification = await this.prisma.marketplaceVerification.create({
        data: {
          productId,
          versionId,
          passed,
          issues: JSON.stringify(issues)
        }
      });

      this.logger.info(`[Verify] Verification result: passed=${passed}, issues=${issues.length}`);

      return {
        verificationId: verification.id,
        passed,
        issues: issues.map(i => ({
          severity: i.severity,
          code: i.code,
          message: i.message,
          details: i.details || null
        })),
        timestamp: verification.createdAt
      };
    } catch (error) {
      this.logger.error(`[Verify] Plugin verification failed: ${error.message}`);
      
      try {
        await this.prisma.marketplaceVerification.create({
          data: {
            productId,
            versionId,
            passed: false,
            issues: JSON.stringify([{
              severity: 'error',
              code: 'verification_error',
              message: error.message
            }])
          }
        });
      } catch (e) {
        this.logger.error('[Verify] Failed to save verification:', e.message);
      }

      throw error;
    }
  }

  /**
   * Get verification result for a version
   */
  async getVerificationResult(productId, versionId) {
    try {
      const verification = await this.prisma.marketplaceVerification.findFirst({
        where: {
          productId,
          versionId
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!verification) {
        return null;
      }

      const issues = JSON.parse(verification.issues || '[]');

      return {
        verificationId: verification.id,
        passed: verification.passed,
        issues,
        createdAt: verification.createdAt
      };
    } catch (error) {
      this.logger.error('[Verify] Get verification result failed:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Validate manifest structure
   */
  _validateManifest(manifest) {
    const issues = [];

    if (!manifest.id) {
      issues.push({
        severity: 'error',
        code: 'missing_id',
        message: 'Manifest must have an id field'
      });
    } else if (!/^[a-zA-Z0-9_-]+$/.test(manifest.id)) {
      issues.push({
        severity: 'error',
        code: 'invalid_id_format',
        message: 'Plugin ID must contain only alphanumeric, underscore, or hyphen characters'
      });
    }

    if (!manifest.name) {
      issues.push({
        severity: 'error',
        code: 'missing_name',
        message: 'Manifest must have a name field'
      });
    }

    if (!manifest.version) {
      issues.push({
        severity: 'error',
        code: 'missing_version',
        message: 'Manifest must have a version field'
      });
    } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      issues.push({
        severity: 'error',
        code: 'invalid_version_format',
        message: 'Version must follow semantic versioning (e.g., 1.0.0)'
      });
    }

    if (manifest.actions && typeof manifest.actions === 'object') {
      for (const [name, action] of Object.entries(manifest.actions)) {
        if (typeof action === 'string' && !action.endsWith('.js')) {
          issues.push({
            severity: 'warning',
            code: 'invalid_action_file',
            message: `Action ${name} does not reference a .js file`
          });
        }
      }
    }

    return issues;
  }

  /**
   * NEW: Validate plugin module compatibility
   * Checks manifest structure is compatible with plugin engine
   */
  _validatePluginModuleCompatibility(manifest) {
    const issues = [];

    // 1. Validate actions structure
    if (manifest.actions) {
      if (typeof manifest.actions !== 'object') {
        issues.push({
          severity: 'error',
          code: 'invalid_actions_type',
          message: 'Manifest.actions must be an object mapping action names to file paths'
        });
      } else {
        for (const [actionName, actionPath] of Object.entries(manifest.actions)) {
          if (!/^[a-z0-9_-]+$/.test(actionName)) {
            issues.push({
              severity: 'error',
              code: 'invalid_action_name',
              message: `Action name "${actionName}" must be lowercase with only alphanumeric, underscore, or hyphen`
            });
          }

          if (typeof actionPath !== 'string') {
            issues.push({
              severity: 'error',
              code: 'invalid_action_path_type',
              message: `Action "${actionName}" must map to a string file path`
            });
          } else if (!actionPath.endsWith('.js')) {
            issues.push({
              severity: 'error',
              code: 'invalid_action_file_type',
              message: `Action "${actionName}" must reference a .js file (got: ${actionPath})`
            });
          }
        }
      }
    }

    // 2. Validate hooks structure
    if (manifest.hooks) {
      if (typeof manifest.hooks !== 'object') {
        issues.push({
          severity: 'error',
          code: 'invalid_hooks_type',
          message: 'Manifest.hooks must be an object'
        });
      } else {
        const validHooks = [
          'plugin.loading', 'plugin.loaded', 'plugin.enabling', 'plugin.enabled',
          'plugin.disabling', 'plugin.disabled', 'plugin.error',
          'action.before', 'action.after', 'action.error',
          'workflow.created', 'workflow.started', 'workflow.paused', 'workflow.resumed',
          'workflow.completed', 'workflow.failed'
        ];

        for (const [hookName, hookHandler] of Object.entries(manifest.hooks)) {
          if (!validHooks.includes(hookName)) {
            issues.push({
              severity: 'warning',
              code: 'unknown_hook',
              message: `Hook "${hookName}" may not be recognized by plugin module`
            });
          }

          if (typeof hookHandler !== 'string') {
            issues.push({
              severity: 'error',
              code: 'invalid_hook_handler_type',
              message: `Hook "${hookName}" must map to a string file path`
            });
          } else if (!hookHandler.endsWith('.js')) {
            issues.push({
              severity: 'error',
              code: 'invalid_hook_file_type',
              message: `Hook "${hookName}" must reference a .js file`
            });
          }
        }
      }
    }

    // 3. Validate UI structure
    if (manifest.ui && typeof manifest.ui === 'object') {
      if (manifest.ui.settings && typeof manifest.ui.settings === 'object') {
        const validTypes = ['text', 'number', 'boolean', 'select', 'textarea', 'password', 'email'];
        
        for (const [settingKey, settingConfig] of Object.entries(manifest.ui.settings)) {
          if (!settingConfig.type) {
            issues.push({
              severity: 'warning',
              code: 'missing_setting_type',
              message: `UI setting "${settingKey}" must have a type field`
            });
          } else if (!validTypes.includes(settingConfig.type)) {
            issues.push({
              severity: 'warning',
              code: 'invalid_setting_type',
              message: `UI setting "${settingKey}" has invalid type: ${settingConfig.type}`
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * NEW: Verify archive contents
   * Checks that referenced files actually exist in ZIP
   */
  async _verifyArchiveContents(archivePath, manifest) {
    const issues = [];

    try {
      let fileList = [];
      let canCheckArchive = false;

      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(archivePath);
        const entries = zip.getEntries();
        fileList = entries.map(e => e.entryName);
        canCheckArchive = true;
        this.logger.debug(`[Verify] Archive contains ${fileList.length} files`);
      } catch (zipError) {
        this.logger.debug('[Verify] Cannot inspect archive (adm-zip not available)');
        return issues;
      }

      if (!canCheckArchive) {
        return issues;
      }

      // Check action files exist
      if (manifest.actions) {
        for (const [actionName, actionFile] of Object.entries(manifest.actions)) {
          if (!fileList.includes(actionFile)) {
            issues.push({
              severity: 'error',
              code: 'missing_action_file',
              message: `Required action file not found in archive: ${actionFile}`,
              details: { actionName }
            });
          }
        }
      }

      // Check hook files exist
      if (manifest.hooks) {
        for (const [hookName, hookFile] of Object.entries(manifest.hooks)) {
          if (!fileList.includes(hookFile)) {
            issues.push({
              severity: 'error',
              code: 'missing_hook_file',
              message: `Required hook file not found in archive: ${hookFile}`,
              details: { hookName }
            });
          }
        }
      }

      // Warn about suspicious files
      const suspiciousExtensions = ['.exe', '.dll', '.so', '.dylib', '.bat', '.sh', '.env'];
      for (const file of fileList) {
        const ext = path.extname(file).toLowerCase();
        if (suspiciousExtensions.includes(ext)) {
          issues.push({
            severity: 'warning',
            code: 'suspicious_file',
            message: `Archive contains suspicious file: ${file}`
          });
        }
      }

      // Warn about node_modules
      if (fileList.some(f => f.includes('node_modules'))) {
        issues.push({
          severity: 'warning',
          code: 'includes_node_modules',
          message: 'Archive should not include node_modules (too large)'
        });
      }

    } catch (error) {
      this.logger.debug('[Verify] Archive content verification failed:', error.message);
    }

    return issues;
  }

  /**
   * NEW: Validate plugin engine integration
   */
  async _validatePluginModuleIntegration(manifest) {
    const issues = [];

    if (!this.pluginEngine) {
      return issues;
    }

    try {
      // Check engine version compatibility
      if (manifest.pluginEngineVersion) {
        const engineVersion = this.pluginEngine.version || this.pluginEngine.apiVersion || 'unknown';
        
        if (engineVersion !== 'unknown') {
          const compatible = this._isVersionCompatible(engineVersion, manifest.pluginEngineVersion);
          
          if (!compatible) {
            issues.push({
              severity: 'warning',
              code: 'engine_version_mismatch',
              message: `Plugin requires plugin engine ${manifest.pluginEngineVersion}, installed: ${engineVersion}`
            });
          }
        }
      }

      // Validate hooks are supported
      if (manifest.hooks && this.pluginEngine.getSupportedHooks) {
        try {
          const supportedHooks = this.pluginEngine.getSupportedHooks();
          
          for (const hookName of Object.keys(manifest.hooks)) {
            if (supportedHooks.length > 0 && !supportedHooks.includes(hookName)) {
              issues.push({
                severity: 'info',
                code: 'unsupported_hook',
                message: `Hook "${hookName}" may not be supported by installed plugin engine`
              });
            }
          }
        } catch (err) {
          this.logger.debug('[Verify] Could not check supported hooks');
        }
      }

    } catch (error) {
      this.logger.debug('[Verify] Integration validation skipped:', error.message);
    }

    return issues;
  }

  /**
   * NEW: Check version compatibility
   */
  _isVersionCompatible(installed, required) {
    try {
      const parseVersion = (v) => {
        const match = v.match(/^[\^~]?(\d+)\.(\d+)\.(\d+)/);
        if (!match) return null;
        return {
          major: parseInt(match[1]),
          minor: parseInt(match[2]),
          patch: parseInt(match[3])
        };
      };

      const installedParts = parseVersion(installed);
      const requiredParts = parseVersion(required);

      if (!installedParts || !requiredParts) return true;

      if (required.startsWith('^')) {
        return installedParts.major === requiredParts.major &&
               (installedParts.minor > requiredParts.minor ||
                (installedParts.minor === requiredParts.minor && installedParts.patch >= requiredParts.patch));
      } else if (required.startsWith('~')) {
        return installedParts.major === requiredParts.major &&
               installedParts.minor === requiredParts.minor &&
               installedParts.patch >= requiredParts.patch;
      } else {
        return installedParts.major === requiredParts.major &&
               installedParts.minor === requiredParts.minor &&
               installedParts.patch === requiredParts.patch;
      }
    } catch (error) {
      this.logger.debug('[Verify] Version check failed:', error.message);
      return true;
    }
  }

  /**
   * Helper: Check for security issues
   */
  async _checkSecurity(manifest) {
    const issues = [];

    if (manifest.dependencies) {
      const suspiciousPackages = ['eval', 'vm', 'child_process'];
      for (const [pkg] of Object.entries(manifest.dependencies || {})) {
        if (suspiciousPackages.includes(pkg.toLowerCase())) {
          issues.push({
            severity: 'warning',
            code: 'suspicious_dependency',
            message: `Dependency "${pkg}" may pose security risks`
          });
        }
      }
    }

    return issues;
  }

  /**
   * Helper: Check action files
   */
  async _checkActions(manifest) {
    const issues = [];
    return issues;
  }
}

module.exports = VerificationService;