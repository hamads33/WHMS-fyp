// src/modules/marketplace/routes/installation.routes.js
// Plugin installation and update API (FR-M03, FR-M04)

const express = require('express');

module.exports = function installationRoutes({
  marketplaceService,
  dependencyService,
  licensingService,
  pluginInstaller,
  analyticsService,
  pluginEngine,
  prisma,
  logger = console
} = {}) {
  const router = express.Router();

  /**
   * FR-M03: POST /install/:productId - Install plugin from marketplace
   */
  router.post('/:productId', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { productId } = req.params;
      const { versionId } = req.body;

      // 1. Get product
      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: productId },
        include: {
          latestVersion: true,
          dependencies: {
            include: {
              dependency: {
                select: {
                  latestVersion: true,
                  slug: true
                }
              }
            }
          }
        }
      });

      if (!product) {
        return res.status(404).json({
          ok: false,
          error: 'Plugin not found'
        });
      }

      if (product.status !== 'approved' || product.disabled) {
        return res.status(403).json({
          ok: false,
          error: 'Plugin not available for installation'
        });
      }

      // Get specific version or use latest
      let version = product.latestVersion;
      if (versionId) {
        version = await prisma.marketplaceVersion.findUnique({
          where: { id: versionId }
        });

        if (!version || !version.approvedAt) {
          return res.status(400).json({
            ok: false,
            error: 'Version not available'
          });
        }
      }

      if (!version) {
        return res.status(400).json({
          ok: false,
          error: 'No approved version available'
        });
      }

      // 2. Check licensing (FR-M05)
      if (product.licenseRequired) {
        const licenseCheck = await licensingService.checkLicense(productId, userId);
        if (!licenseCheck.canInstall) {
          return res.status(403).json({
            ok: false,
            error: 'License required',
            licenseInfo: {
              type: licenseCheck.licenseType,
              message: licenseCheck.message
            }
          });
        }
      }

      // 3. Resolve and check dependencies (FR-M07)
      let manifest;
      try {
        manifest = typeof version.manifestJson === 'string'
          ? JSON.parse(version.manifestJson)
          : version.manifestJson;
      } catch (e) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid plugin manifest'
        });
      }

      const dependencyCheck = await dependencyService.checkDependencies(
        productId,
        version.id,
        manifest
      );

      if (dependencyCheck.status === 'incomplete') {
        return res.status(400).json({
          ok: false,
          error: 'Missing dependencies',
          missing: dependencyCheck.missing
        });
      }

      if (dependencyCheck.status === 'pending') {
        return res.status(400).json({
          ok: false,
          error: 'Dependency approval pending',
          pending: dependencyCheck.pendingApproval
        });
      }

      // 4. Install dependencies first
      const installationLog = {
        productId,
        versionId: version.id,
        userId,
        steps: [],
        errors: []
      };

      if (dependencyCheck.dependencies.length > 0) {
        for (const dep of dependencyCheck.dependencies) {
          try {
            // Recursively install dependencies
            const depInstall = await prisma.marketplaceProduct.findUnique({
              where: { id: dep.productId },
              include: { latestVersion: true }
            });

            if (depInstall && pluginInstaller) {
              await pluginInstaller.install({
                pluginId: dep.name,
                archivePath: depInstall.latestVersion?.archivePath,
                manifest: depInstall.latestVersion?.manifestJson
              });

              installationLog.steps.push({
                type: 'dependency_installed',
                dependency: dep.name,
                version: dep.requiredVersion
              });
            }
          } catch (error) {
            installationLog.errors.push({
              type: 'dependency_failed',
              dependency: dep.name,
              message: error.message
            });
          }
        }
      }

      // 5. Download and install plugin (FR-M03)
      try {
        if (pluginInstaller) {
          const result = await pluginInstaller.install({
            pluginId: product.slug || product.name,
            archivePath: version.archivePath,
            manifest
          });

          installationLog.steps.push({
            type: 'plugin_installed',
            pluginId: product.id,
            version: version.version,
            result
          });
        } else {
          throw new Error('Plugin installer not available');
        }
      } catch (error) {
        installationLog.errors.push({
          type: 'installation_failed',
          message: error.message
        });

        return res.status(500).json({
          ok: false,
          error: 'Installation failed',
          details: error.message,
          log: installationLog
        });
      }

      // 6. Reload plugin engine
      if (pluginEngine && pluginEngine.reload) {
        try {
          await pluginEngine.reload();
          installationLog.steps.push({
            type: 'engine_reloaded'
          });
        } catch (error) {
          logger.warn('[Install] Failed to reload engine:', error.message);
        }
      }

      // 7. Track analytics (FR-M09)
      try {
        await analyticsService.trackEvent(
          productId,
          version.id,
          userId,
          'install',
          { userAgent: req.get('user-agent') }
        );

        installationLog.steps.push({
          type: 'analytics_tracked'
        });
      } catch (error) {
        logger.debug('[Install] Analytics tracking failed:', error.message);
      }

      res.json({
        ok: true,
        message: 'Plugin installed successfully',
        data: {
          productId,
          productName: product.name,
          version: version.version,
          installed: true,
          log: installationLog
        }
      });
    } catch (error) {
      logger.error('[Install] Installation error:', error.message);
      next(error);
    }
  });

  /**
   * FR-M04: POST /update/:productId - Update plugin to newer version
   */
  router.post('/update/:productId', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { productId } = req.params;
      const { versionId } = req.body;

      // Get product and check for newer versions
      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: productId },
        include: {
          versions: {
            where: { approvedAt: { not: null } },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!product) {
        return res.status(404).json({
          ok: false,
          error: 'Plugin not found'
        });
      }

      if (product.status !== 'approved' || product.disabled) {
        return res.status(403).json({
          ok: false,
          error: 'Plugin not available'
        });
      }

      // Get target version
      let targetVersion = product.versions[0];
      if (versionId) {
        targetVersion = product.versions.find(v => v.id === versionId);
        if (!targetVersion) {
          return res.status(400).json({
            ok: false,
            error: 'Version not found'
          });
        }
      }

      if (!targetVersion) {
        return res.status(400).json({
          ok: false,
          error: 'No approved version available'
        });
      }

      // Re-run license check
      if (product.licenseRequired) {
        const licenseCheck = await licensingService.checkLicense(productId, userId);
        if (!licenseCheck.canInstall) {
          return res.status(403).json({
            ok: false,
            error: 'License required for update'
          });
        }
      }

      // Parse manifest
      let manifest;
      try {
        manifest = typeof targetVersion.manifestJson === 'string'
          ? JSON.parse(targetVersion.manifestJson)
          : targetVersion.manifestJson;
      } catch (e) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid plugin manifest'
        });
      }

      // Check dependencies again for new version
      const dependencyCheck = await dependencyService.checkDependencies(
        productId,
        targetVersion.id,
        manifest
      );

      if (dependencyCheck.status !== 'valid') {
        return res.status(400).json({
          ok: false,
          error: 'Dependency check failed for update',
          dependencies: dependencyCheck
        });
      }

      // Update plugin (essentially reinstall with new version)
      const updateLog = {
        productId,
        fromVersion: null, // Could be tracked if we store installed versions
        toVersion: targetVersion.version,
        versionId: targetVersion.id,
        userId,
        steps: [],
        errors: []
      };

      try {
        if (pluginInstaller) {
          const result = await pluginInstaller.install({
            pluginId: product.slug || product.name,
            archivePath: targetVersion.archivePath,
            manifest,
            isUpdate: true
          });

          updateLog.steps.push({
            type: 'plugin_updated',
            version: targetVersion.version,
            result
          });
        }
      } catch (error) {
        updateLog.errors.push({
          type: 'update_failed',
          message: error.message
        });

        return res.status(500).json({
          ok: false,
          error: 'Update failed',
          details: error.message,
          log: updateLog
        });
      }

      // Reload plugin engine
      if (pluginEngine && pluginEngine.reload) {
        try {
          await pluginEngine.reload();
          updateLog.steps.push({ type: 'engine_reloaded' });
        } catch (error) {
          logger.warn('[Update] Failed to reload engine:', error.message);
        }
      }

      // Track analytics
      try {
        await analyticsService.trackEvent(
          productId,
          targetVersion.id,
          userId,
          'update',
          { userAgent: req.get('user-agent') }
        );
      } catch (error) {
        logger.debug('[Update] Analytics tracking failed:', error.message);
      }

      res.json({
        ok: true,
        message: 'Plugin updated successfully',
        data: {
          productId,
          productName: product.name,
          version: targetVersion.version,
          updated: true,
          log: updateLog
        }
      });
    } catch (error) {
      logger.error('[Update] Update error:', error.message);
      next(error);
    }
  });

  /**
   * GET /installed - List installed marketplace plugins
   */
  router.get('/installed', async (req, res, next) => {
    try {
      const userId = req.user.id;

      // This would require tracking installed plugins per user
      // For now, return placeholder
      res.json({
        ok: true,
        data: [],
        message: 'User plugin installation tracking requires additional implementation'
      });
    } catch (error) {
      logger.error('[Install] Get installed error:', error.message);
      next(error);
    }
  });

  /**
   * DELETE /installed/:productId - Uninstall plugin
   */
  router.delete('/installed/:productId', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      // This would require integration with plugin engine uninstall
      // Placeholder for now
      res.json({
        ok: true,
        message: 'Plugin uninstall requires integration with plugin engine'
      });
    } catch (error) {
      logger.error('[Install] Uninstall error:', error.message);
      next(error);
    }
  });

  return router;
};