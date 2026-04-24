/**
 * Provisioning Service
 * Path: src/modules/provisioning/services/provisioning.service.js
 *
 * Orchestrates CyberPanel hosting provisioning over SSH.
 * CyberPanel is domain-centric: the primary entity is a "website" (domain),
 * not a username. Accounts, emails, and databases are all attached to domains.
 *
 * Flow:
 *   Order activated → provisionAccount() → creates HostingAccount record
 *   Client sets domain → provisionDomain() → cyberpanel createWebsite via SSH
 *   Client adds email → provisionEmail() → cyberpanel createEmail via SSH
 */

const prisma = require('../../../../prisma');
const { CyberPanelDriver } = require('../drivers/cyberpanel.driver');
const { generateSecurePassword } = require('../utils/provisioning.util');
const { encryptValue, decryptValue } = require('../../../utils/encryption');
const settingsService = require('../../settings/settings.service');

class ProvisioningService {
  /**
   * Build a CyberPanel driver from DB-stored SSH credentials,
   * falling back to environment variables.
   */
  async _getDriver() {
    try {
      const creds = await settingsService.getCyberPanelCredentials();
      if (creds.host && (creds.sshPrivateKey || creds.sshPassword)) {
        return new CyberPanelDriver(creds);
      }
    } catch (err) {
      console.warn('[PROVISIONING] Could not load CyberPanel creds from DB:', err.message);
    }

    // Fallback: singleton configured via env vars
    const singleton = require('../drivers/cyberpanel.driver');
    return singleton.configured ? singleton : null;
  }

  /**
   * Provision a hosting account when an order becomes active.
   *
   * In CyberPanel, websites are domain-centric, so this step only creates
   * the DB record. The actual website is created when the client provides
   * their domain via provisionDomain().
   */
  async provisionAccount(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        snapshot: true,
        client: { select: { id: true, email: true } },
      },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (order.status !== 'active') {
      const err = new Error('Only active orders can be provisioned');
      err.statusCode = 409;
      throw err;
    }

    const existing = await prisma.hostingAccount.findFirst({ where: { orderId } });
    if (existing) {
      return existing;
    }

    const driver = await this._getDriver();
    const username = this._generateUsername(order.client.email, orderId);
    const password = generateSecurePassword();

    if (!driver) {
      console.warn(`[PROVISIONING] No CyberPanel configured — order ${orderId} marked manual`);
      const account = await prisma.hostingAccount.create({
        data: {
          orderId,
          clientId: order.clientId,
          username,
          password: encryptValue(password),
          controlPanel: 'manual',
          status: 'pending',
        },
      });
      await prisma.order.update({
        where: { id: orderId },
        data: { provisioningStatus: 'pending_manual', provisioningError: null },
      }).catch(() => {});
      return account;
    }

    try {
      const hostingAccount = await prisma.hostingAccount.create({
        data: {
          orderId,
          clientId: order.clientId,
          username,
          password: encryptValue(password),
          controlPanel: 'cyberpanel',
          status: 'pending',
          provisionedAt: new Date(),
        },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { provisioningStatus: 'provisioned', provisioningError: null },
      });

      console.log(`[PROVISIONING] Account record created: ${username} for order ${orderId}`);
      return hostingAccount;
    } catch (err) {
      console.error(`[PROVISIONING ERROR] Order ${orderId}:`, err.message);
      await prisma.order.update({
        where: { id: orderId },
        data: { provisioningStatus: 'failed', provisioningError: err.message },
      });
      throw err;
    }
  }

  /**
   * Provision (create) a website on CyberPanel for a given domain.
   * This is the step that actually calls `cyberpanel createWebsite` via SSH.
   */
  async provisionDomain(username, domainData) {
    const account = await prisma.hostingAccount.findFirst({ where: { username } });
    if (!account) {
      const err = new Error('Hosting account not found');
      err.statusCode = 404;
      throw err;
    }

    const driver = await this._getDriver();
    if (!driver) throw new Error('CyberPanel SSH not configured');

    const order = await prisma.order.findUnique({
      where: { id: account.orderId },
      include: { client: { select: { email: true } } },
    });

    console.log(`[PROVISIONING] Creating website ${domainData.domain} for ${username}`);

    await driver.createWebsite({
      domain: domainData.domain,
      email: order?.client?.email || `admin@${domainData.domain}`,
      phpVersion: domainData.phpVersion || '8.1',
      package: domainData.package || 'Default',
    });

    const domain = await prisma.hostingDomain.create({
      data: {
        hostingAccountId: account.id,
        domain: domainData.domain,
        status: 'active',
      },
    });

    // Update account to active now that a website exists
    await prisma.hostingAccount.update({
      where: { id: account.id },
      data: { status: 'active' },
    });
    await prisma.order.update({
      where: { id: account.orderId },
      data: { provisioningStatus: 'provisioned', provisioningError: null },
    }).catch(() => {});

    // Attempt SSL immediately; if it fails it can be retried separately
    try {
      await driver.issueSSL(domainData.domain);
      await prisma.hostingDomain.update({
        where: { id: domain.id },
        data: { sslStatus: 'active' },
      });
    } catch (sslErr) {
      console.warn(`[PROVISIONING] SSL deferred for ${domainData.domain}:`, sslErr.message);
    }

    return domain;
  }

  /**
   * Deprovision: delete website from CyberPanel and mark account as deleted.
   */
  async deprovisionAccount(orderId) {
    const account = await prisma.hostingAccount.findFirst({ where: { orderId } });
    if (!account) {
      const err = new Error('No hosting account found for this order');
      err.statusCode = 404;
      throw err;
    }

    const driver = await this._getDriver();

    if (driver && account.controlPanel === 'cyberpanel') {
      // Delete all provisioned domains from CyberPanel
      const domains = await prisma.hostingDomain.findMany({
        where: { hostingAccountId: account.id },
      });

      for (const d of domains) {
        try {
          await driver.deleteWebsite(d.domain);
          console.log(`[PROVISIONING] Deleted website: ${d.domain}`);
        } catch (err) {
          console.warn(`[PROVISIONING] Failed to delete website ${d.domain}:`, err.message);
        }
      }
    }

    await prisma.hostingAccount.update({
      where: { id: account.id },
      data: { status: 'deleted', deletedAt: new Date() },
    });

    console.log(`[PROVISIONING] Account terminated: ${account.username}`);
    return account;
  }

  /**
   * Suspend all domains for an account (non-payment or admin action).
   */
  async suspendAccount(orderId, reason = 'non-payment') {
    const account = await prisma.hostingAccount.findFirst({ where: { orderId } });
    if (!account) {
      const err = new Error('No hosting account found for this order');
      err.statusCode = 404;
      throw err;
    }

    if (account.status === 'suspended') return account;

    const driver = await this._getDriver();

    if (driver && account.controlPanel === 'cyberpanel') {
      const domains = await prisma.hostingDomain.findMany({
        where: { hostingAccountId: account.id },
      });
      for (const d of domains) {
        try {
          await driver.suspendWebsite(d.domain);
        } catch (err) {
          console.warn(`[PROVISIONING] Suspend failed for ${d.domain}:`, err.message);
        }
      }
    }

    const updated = await prisma.hostingAccount.update({
      where: { id: account.id },
      data: { status: 'suspended', suspendedAt: new Date(), suspendReason: reason },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'suspended', suspendedAt: new Date() },
    }).catch(() => {});
    return updated;
  }

  /**
   * Unsuspend all domains for an account (payment received).
   */
  async unsuspendAccount(orderId) {
    const account = await prisma.hostingAccount.findFirst({ where: { orderId } });
    if (!account) {
      const err = new Error('No hosting account found for this order');
      err.statusCode = 404;
      throw err;
    }

    if (account.status !== 'suspended') return account;

    const driver = await this._getDriver();

    if (driver && account.controlPanel === 'cyberpanel') {
      const domains = await prisma.hostingDomain.findMany({
        where: { hostingAccountId: account.id },
      });
      for (const d of domains) {
        try {
          await driver.unsuspendWebsite(d.domain);
        } catch (err) {
          console.warn(`[PROVISIONING] Unsuspend failed for ${d.domain}:`, err.message);
        }
      }
    }

    const updated = await prisma.hostingAccount.update({
      where: { id: account.id },
      data: { status: 'active', suspendedAt: null, suspendReason: null },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'active', suspendedAt: null },
    }).catch(() => {});
    return updated;
  }

  /**
   * Issue/renew SSL for a specific domain.
   */
  async issueSSL(username, domain) {
    const account = await prisma.hostingAccount.findFirst({ where: { username } });
    if (!account) {
      const err = new Error('Hosting account not found');
      err.statusCode = 404;
      throw err;
    }

    const driver = await this._getDriver();
    if (!driver) throw new Error('CyberPanel SSH not configured');

    await driver.issueSSL(domain);

    const domainRecord = await prisma.hostingDomain.findFirst({
      where: { hostingAccountId: account.id, domain },
    });

    if (domainRecord) {
      await prisma.hostingDomain.update({
        where: { id: domainRecord.id },
        data: { sslStatus: 'active' },
      });
    }

    return { success: true, domain, ssl: 'letsencrypt' };
  }

  /**
   * Create a database for a domain.
   */
  async provisionDatabase(username, domain, dbData) {
    const account = await prisma.hostingAccount.findFirst({ where: { username } });
    if (!account) {
      const err = new Error('Hosting account not found');
      err.statusCode = 404;
      throw err;
    }

    const driver = await this._getDriver();
    if (!driver) throw new Error('CyberPanel SSH not configured');

    const dbPassword = dbData.password || generateSecurePassword();

    await driver.createDatabase({
      domain,
      dbName: dbData.name,
      dbUser: dbData.user || dbData.name,
      dbPassword,
    });

    const dbRecord = await prisma.hostingDatabase.create({
      data: {
        hostingAccountId: account.id,
        name: dbData.name,
        dbUser: dbData.user || dbData.name,
        dbPassword: encryptValue(dbPassword),
        type: 'mysql',
        status: 'active',
      },
    });

    return dbRecord;
  }

  /**
   * Create an email account for a domain.
   */
  async provisionEmail(username, domain, emailData) {
    const account = await prisma.hostingAccount.findFirst({ where: { username } });
    if (!account) {
      const err = new Error('Hosting account not found');
      err.statusCode = 404;
      throw err;
    }

    const driver = await this._getDriver();
    if (!driver) throw new Error('CyberPanel SSH not configured');

    const password = emailData.password || generateSecurePassword();

    await driver.createEmail({
      domain,
      emailUser: emailData.account,
      password,
      quota: emailData.quota || 100,
    });

    const emailRecord = await prisma.hostingEmail.create({
      data: {
        hostingAccountId: account.id,
        email: `${emailData.account}@${domain}`,
        password: encryptValue(password),
        quota: emailData.quota || 100,
        status: 'active',
      },
    });

    return emailRecord;
  }

  /**
   * Sync account disk/bandwidth usage from the server via SSH.
   * Uses `du` since CyberPanel has no CLI command for per-user stats.
   */
  async syncAccountStats(username) {
    const account = await prisma.hostingAccount.findFirst({ where: { username } });
    if (!account) throw new Error('Account not found');

    const domains = await prisma.hostingDomain.findMany({
      where: { hostingAccountId: account.id },
    });

    if (!domains.length) return { diskUsedMB: 0, bandwidthUsedGB: 0 };

    const driver = await this._getDriver();
    if (!driver) throw new Error('CyberPanel SSH not configured');

    let totalBytes = 0;
    for (const d of domains) {
      try {
        // Run safe du command on the website's document root
        const safeDir = `/home/${d.domain}/public_html`;
        const result = await driver._sshExec(
          `du -sb ${safeDir} 2>/dev/null | awk '{print $1}'`
        );
        const raw = result?.output || result?.raw || '0';
        totalBytes += parseInt(raw.trim(), 10) || 0;
      } catch {
        // Non-fatal — skip this domain
      }
    }

    const diskUsedMB = Math.round(totalBytes / 1048576);

    await prisma.hostingAccount.update({
      where: { id: account.id },
      data: { diskUsedMB, lastSyncedAt: new Date() },
    });

    return { diskUsedMB, bandwidthUsedGB: null };
  }

  // ── Lookup helpers ──────────────────────────────────────────────────────────

  async getAccountByOrderId(orderId) {
    const account = await prisma.hostingAccount.findFirst({ where: { orderId } });
    if (!account) {
      const err = new Error('Hosting account not found');
      err.statusCode = 404;
      throw err;
    }
    return account;
  }

  async getAccountByUsername(username) {
    const account = await prisma.hostingAccount.findFirst({ where: { username } });
    if (!account) {
      const err = new Error('Hosting account not found');
      err.statusCode = 404;
      throw err;
    }
    return account;
  }

  async getClientAccounts(clientId) {
    return prisma.hostingAccount.findMany({
      where: { clientId },
      include: { domains: true, emails: true, databases: true },
    });
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  _generateUsername(email, orderId) {
    const prefix = email
      .split('@')[0]
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .substring(0, 8);
    return `${prefix}-${orderId}`.substring(0, 16);
  }
}

module.exports = new ProvisioningService();
