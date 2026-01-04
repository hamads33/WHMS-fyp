// src/modules/marketplace/services/dependency.service.js
// Handle plugin dependency resolution and validation

class DependencyService {
  constructor({ prisma = null, logger = console, pluginEngine = null } = {}) {
    this.prisma = prisma;
    this.logger = logger;
    this.pluginEngine = pluginEngine;
  }

  /**
   * FR-M07: Check plugin dependencies
   * @param {string} productId - Product ID
   * @param {string} versionId - Version ID
   * @param {Object} manifest - Plugin manifest
   * @returns {Promise<Object>} Dependency check result
   */
  async checkDependencies(productId, versionId, manifest = {}) {
    try {
      const dependencies = manifest.dependencies || {};
      const results = {
        status: 'valid', // valid, incomplete, pending, invalid
        dependencies: [],
        missing: [],
        pendingApproval: [],
        errors: []
      };

      // No dependencies
      if (Object.keys(dependencies).length === 0) {
        return results;
      }

      // Check each dependency
      for (const [depName, depConstraint] of Object.entries(dependencies)) {
        try {
          const depProduct = await this.prisma.marketplaceProduct?.findFirst({
            where: {
              OR: [
                { name: depName },
                { slug: depName }
              ]
            },
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              versions: {
                where: { approved: true },
                select: { version: true },
                orderBy: { createdAt: 'desc' }
              }
            }
          });

          if (!depProduct) {
            results.status = 'incomplete';
            results.missing.push({
              name: depName,
              constraint: depConstraint,
              reason: 'Dependency plugin not found in marketplace'
            });
            continue;
          }

          if (depProduct.status !== 'approved') {
            results.status = 'pending';
            results.pendingApproval.push({
              name: depName,
              productId: depProduct.id,
              status: depProduct.status
            });
            continue;
          }

          const compatibleVersions = depProduct.versions
            .map(v => v.version)
            .filter(v => this._satisfiesConstraint(v, depConstraint));

          if (compatibleVersions.length === 0) {
            results.status = 'incomplete';
            results.missing.push({
              name: depName,
              constraint: depConstraint,
              availableVersions: depProduct.versions.map(v => v.version),
              reason: 'No compatible version available'
            });
            continue;
          }

          results.dependencies.push({
            name: depName,
            productId: depProduct.id,
            constraint: depConstraint,
            resolvedVersion: compatibleVersions[0],
            availableVersions: compatibleVersions
          });
        } catch (error) {
          results.errors.push({
            dependency: depName,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error('[Dependency] Check dependencies error:', error.message);
      throw error;
    }
  }

  /**
   * Get product dependencies
   * @param {string} productId - Product ID
   * @returns {Promise<Array>} Dependencies
   */
  async getProductDependencies(productId) {
    try {
      const product = await this.prisma.marketplaceProduct?.findUnique({
        where: { id: productId },
        include: {
          dependencies: {
            include: {
              dependency: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                  icon: true,
                  avgRating: true,
                  totalDownloads: true
                }
              }
            }
          }
        }
      });

      if (!product) {
        return [];
      }

      return product.dependencies.map(dep => ({
        id: dep.dependency.id,
        name: dep.dependency.name,
        slug: dep.dependency.slug,
        icon: dep.dependency.icon,
        status: dep.dependency.status,
        required: dep.required,
        minVersion: dep.minVersion,
        avgRating: dep.dependency.avgRating,
        totalDownloads: dep.dependency.totalDownloads
      }));
    } catch (error) {
      this.logger.error('[Dependency] Get dependencies error:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Check if version satisfies constraint
   * Supports: ^1.0.0, ~1.0.0, >=1.0.0, 1.0.0, etc.
   */
  _satisfiesConstraint(version, constraint) {
    try {
      const parseVer = (v) => {
        const match = v.match(/^v?(\d+)\.(\d+)\.(\d+)/);
        if (!match) return null;
        return {
          major: parseInt(match[1]),
          minor: parseInt(match[2]),
          patch: parseInt(match[3])
        };
      };

      const ver = parseVer(version);
      const constraintNoPrefix = constraint.replace(/^[\^~>=<]+/, '');
      const minVer = parseVer(constraintNoPrefix);

      if (!ver || !minVer) return false;

      if (constraint.startsWith('^')) {
        return ver.major === minVer.major &&
               (ver.minor > minVer.minor ||
                (ver.minor === minVer.minor && ver.patch >= minVer.patch));
      } else if (constraint.startsWith('~')) {
        return ver.major === minVer.major &&
               ver.minor === minVer.minor &&
               ver.patch >= minVer.patch;
      } else if (constraint.startsWith('>=')) {
        return ver.major > minVer.major ||
               (ver.major === minVer.major && ver.minor > minVer.minor) ||
               (ver.major === minVer.major && ver.minor === minVer.minor && ver.patch >= minVer.patch);
      }

      // Exact version match
      return ver.major === minVer.major &&
             ver.minor === minVer.minor &&
             ver.patch === minVer.patch;
    } catch (error) {
      return false;
    }
  }
}

module.exports = DependencyService;