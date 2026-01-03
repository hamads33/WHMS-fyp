// src/modules/marketplace/services/licensing.service.js
// Handles plugin licensing and license management

class LicensingService {
  constructor({ prisma = null, logger = console } = {}) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * License types
   */
  static LICENSE_TYPES = {
    FREE: 'free',
    SINGLE: 'single-device',
    TEAM: 'team',
    ENTERPRISE: 'enterprise',
    SUBSCRIPTION: 'subscription'
  };

  /**
   * Generate license key
   */
  generateLicenseKey(productId, userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    const hash = this._simpleHash(`${productId}${userId}${timestamp}`);

    return `LIC-${hash}-${random}`;
  }

  /**
   * Validate license key
   */
  async validateLicense(licenseKey, productId, userId) {
    try {
      if (!this.prisma?.pluginLicense) {
        this.logger.warn('⚠️ License table not available');
        return { valid: true, message: 'License verification skipped' };
      }

      const license = await this.prisma.pluginLicense.findFirst({
        where: {
          licenseKey,
          productId,
          userId
        }
      });

      if (!license) {
        return {
          valid: false,
          error: 'Invalid license key',
          message: 'License key not found'
        };
      }

      // Check if license is active
      if (license.status === 'revoked') {
        return {
          valid: false,
          error: 'License revoked',
          message: 'This license has been revoked'
        };
      }

      // Check expiration
      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return {
          valid: false,
          error: 'License expired',
          message: 'This license has expired'
        };
      }

      // Check device limit
      if (license.type === 'single-device' && license.deviceCount > 1) {
        return {
          valid: false,
          error: 'Device limit exceeded',
          message: 'Single device license can only be used on 1 device'
        };
      }

      return {
        valid: true,
        license: {
          key: license.licenseKey,
          type: license.type,
          status: license.status,
          expiresAt: license.expiresAt,
          deviceCount: license.deviceCount,
          maxDevices: license.maxDevices
        }
      };
    } catch (error) {
      this.logger.error('❌ License validation error:', error.message);
      return {
        valid: false,
        error: 'Validation failed',
        message: error.message
      };
    }
  }

  /**
   * Create license
   */
  async createLicense(productId, userId, type = 'free', options = {}) {
    try {
      if (!this.prisma?.pluginLicense) {
        this.logger.warn('⚠️ License table not available');
        return null;
      }

      const licenseKey = this.generateLicenseKey(productId, userId);

      const license = await this.prisma.pluginLicense.create({
        data: {
          id: this._generateId(),
          licenseKey,
          productId,
          userId,
          type: type || 'free',
          status: 'active',
          issuedAt: new Date(),
          expiresAt: options.expiresAt || null,
          maxDevices: options.maxDevices || 1,
          deviceCount: 0,
          meta: options.meta || {}
        }
      });

      this.logger.info(`✅ License created: ${licenseKey}`);
      return license;
    } catch (error) {
      this.logger.error('❌ Create license error:', error.message);
      return null;
    }
  }

  /**
   * Revoke license
   */
  async revokeLicense(licenseKey, reason = '') {
    try {
      if (!this.prisma?.pluginLicense) {
        this.logger.warn('⚠️ License table not available');
        return null;
      }

      const license = await this.prisma.pluginLicense.updateMany({
        where: { licenseKey },
        data: {
          status: 'revoked',
          revokedAt: new Date(),
          meta: {
            revokeReason: reason,
            revokedAt: new Date().toISOString()
          }
        }
      });

      this.logger.info(`✅ License revoked: ${licenseKey}`);
      return license;
    } catch (error) {
      this.logger.error('❌ Revoke license error:', error.message);
      return null;
    }
  }

  /**
   * Register device for license
   */
  async registerDevice(licenseKey, deviceId, deviceInfo = {}) {
    try {
      if (!this.prisma?.pluginLicense) {
        this.logger.warn('⚠️ License table not available');
        return null;
      }

      const license = await this.prisma.pluginLicense.findFirst({
        where: { licenseKey }
      });

      if (!license) {
        return {
          ok: false,
          error: 'License not found'
        };
      }

      // Check device limit
      if (license.deviceCount >= license.maxDevices) {
        return {
          ok: false,
          error: 'Device limit exceeded',
          message: `This license supports max ${license.maxDevices} device(s)`
        };
      }

      // Register device
      await this.prisma.pluginLicense.update({
        where: { licenseKey },
        data: {
          deviceCount: { increment: 1 },
          meta: {
            ...license.meta,
            devices: [
              ...(license.meta?.devices || []),
              {
                id: deviceId,
                ...deviceInfo,
                registeredAt: new Date().toISOString()
              }
            ]
          }
        }
      });

      this.logger.info(`✅ Device registered for license: ${licenseKey}`);
      return {
        ok: true,
        message: 'Device registered'
      };
    } catch (error) {
      this.logger.error('❌ Register device error:', error.message);
      return {
        ok: false,
        error: error.message
      };
    }
  }

  /**
   * Get user licenses
   */
  async getUserLicenses(userId) {
    try {
      if (!this.prisma?.pluginLicense) {
        this.logger.warn('⚠️ License table not available');
        return [];
      }

      const licenses = await this.prisma.pluginLicense.findMany({
        where: {
          userId,
          status: 'active'
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              icon: true
            }
          }
        },
        orderBy: { issuedAt: 'desc' }
      });

      return licenses;
    } catch (error) {
      this.logger.error('❌ Get user licenses error:', error.message);
      return [];
    }
  }

  /**
   * Get product licensing statistics
   */
  async getProductLicenseStats(productId) {
    try {
      if (!this.prisma?.pluginLicense) {
        this.logger.warn('⚠️ License table not available');
        return null;
      }

      const [
        totalLicenses,
        activeLicenses,
        revokedLicenses,
        licenses
      ] = await Promise.all([
        this.prisma.pluginLicense?.count({ where: { productId } }) || 0,
        this.prisma.pluginLicense?.count({
          where: { productId, status: 'active' }
        }) || 0,
        this.prisma.pluginLicense?.count({
          where: { productId, status: 'revoked' }
        }) || 0,
        this.prisma.pluginLicense?.findMany({
          where: { productId },
          select: { type: true }
        }) || []
      ]);

      const licensesByType = {
        free: 0,
        'single-device': 0,
        team: 0,
        enterprise: 0,
        subscription: 0
      };

      licenses.forEach(lic => {
        if (licensesByType.hasOwnProperty(lic.type)) {
          licensesByType[lic.type]++;
        }
      });

      return {
        productId,
        totalLicenses,
        activeLicenses,
        revokedLicenses,
        licensesByType,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('❌ Get license stats error:', error.message);
      return null;
    }
  }

  /**
   * Check if product requires license
   */
  async isLicenseRequired(productId) {
    try {
      if (!this.prisma?.marketplaceProduct) {
        return false;
      }

      const product = await this.prisma.marketplaceProduct.findUnique({
        where: { id: productId },
        select: { licenseRequired: true }
      });

      return product?.licenseRequired || false;
    } catch (error) {
      this.logger.error('❌ Check license requirement error:', error.message);
      return false;
    }
  }

  /**
   * Validate before installation
   */
  async validateInstallationLicense(productId, userId) {
    try {
      const licenseRequired = await this.isLicenseRequired(productId);

      if (!licenseRequired) {
        return { valid: true, message: 'No license required' };
      }

      const licenses = await this.getUserLicenses(userId);
      const hasValidLicense = licenses.some(
        lic => lic.productId === productId && lic.status === 'active'
      );

      if (!hasValidLicense) {
        return {
          valid: false,
          error: 'Valid license required',
          message: 'You need a valid license to install this plugin'
        };
      }

      return { valid: true, message: 'License valid' };
    } catch (error) {
      this.logger.error('❌ Validate installation license error:', error.message);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  _generateId() {
    return `lic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).toUpperCase().substr(0, 8);
  }
}

module.exports = LicensingService;