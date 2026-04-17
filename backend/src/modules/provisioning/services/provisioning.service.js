/**
 * Provisioning Service
 * Path: src/modules/provisioning/services/provisioning.service.js
 *
 * Responsibility:
 * - Account provisioning when order activates
 * - Account suspension on non-payment
 * - Account unsuspension on payment
 * - Account termination when order terminates
 * - Sync account status and usage metrics
 */

const prisma = require("../../../../prisma");
const vestaCPClient = require("../clients/vestacp-client");
const { generateSecurePassword } = require("../utils/provisioning.util");
const { encryptValue, decryptValue } = require("../../../utils/encryption");

class ProvisioningService {
  /**
   * Provision hosting account from order
   * Called when order.status changes to 'active'
   *
   * Steps:
   * 1. Create VestaCP account
   * 2. Provision domain if order includes domain
   * 3. Create email accounts if order includes email
   * 4. Provision databases if order includes database
   * 5. Issue SSL certificate
   * 6. Store hosting account record in DB
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
      const err = new Error("Order not found");
      err.statusCode = 404;
      throw err;
    }

    if (order.status !== "active") {
      const err = new Error("Only active orders can be provisioned");
      err.statusCode = 409;
      throw err;
    }

    // Check if already provisioned
    const existing = await prisma.hostingAccount.findFirst({
      where: { orderId },
    });

    if (existing) {
      const err = new Error("Account already provisioned for this order");
      err.statusCode = 409;
      throw err;
    }

    const snap = order.snapshot;
    const clientId = order.clientId;

    // If no VestaCP configured, mark as manually provisioned and return
    if (!vestaCPClient.configured) {
      console.warn(`[PROVISIONING] No VestaCP configured — marking order ${orderId} as manually provisioned`);
      const hostingAccount = await prisma.hostingAccount.upsert({
        where: { orderId },
        update: { status: "active", provisionedAt: new Date() },
        create: {
          orderId,
          clientId,
          username: `manual_${orderId}`,
          password: "",
          controlPanel: "manual",
          status: "active",
          provisionedAt: new Date(),
        },
      });
      return hostingAccount;
    }

    try {
      // Step 1: Generate VestaCP username and password
      const username = this._generateUsername(order.client.email, orderId);
      const password = generateSecurePassword();

      // Step 2: Create VestaCP account
      console.log(`[PROVISIONING] Creating VestaCP account: ${username}`);
      await vestaCPClient.createAccount({
        username,
        password,
        email: order.client.email,
        firstName: order.client.email.split("@")[0],
      });

      // Step 3: Store hosting account in DB
      const hostingAccount = await prisma.hostingAccount.create({
        data: {
          orderId,
          clientId,
          username,
          password: encryptValue(password),
          controlPanel: "vestacp",
          status: "active",
          provisionedAt: new Date(),
        },
      });

      // Step 4: If order includes domain, provision it
      // (This would come from service/plan configuration)
      if (snap.plan?.features?.includeDomain) {
        // Note: Domain would be provided by client after ordering
        console.log(`[PROVISIONING] Domain provisioning: pending client input`);
      }

      // Step 5: Issue SSL (can be done after domain creation)
      // await vestaCPClient.issueSSL(username, domain);

      // Step 6: Sync to invoice for record keeping
      console.log(
        `[PROVISIONING] Account provisioned: ${username} for order ${orderId}`
      );

      return hostingAccount;
    } catch (err) {
      // Log provisioning error
      console.error(`[PROVISIONING ERROR] Order ${orderId}:`, err.message);

      // Mark order as provisioning_failed
      await prisma.order.update({
        where: { id: orderId },
        data: {
          provisioningStatus: "failed",
          provisioningError: err.message,
        },
      });

      throw err;
    }
  }

  /**
   * Deprovision account (delete from VestaCP)
   * Called when order.status changes to 'terminated'
   */
  async deprovisionAccount(orderId) {
    const account = await prisma.hostingAccount.findFirst({
      where: { orderId },
    });

    if (!account) {
      const err = new Error("No hosting account found for this order");
      err.statusCode = 404;
      throw err;
    }

    try {
      console.log(`[PROVISIONING] Deleting VestaCP account: ${account.username}`);
      await vestaCPClient.deleteAccount(account.username);

      // Mark as deleted
      await prisma.hostingAccount.update({
        where: { id: account.id },
        data: {
          status: "deleted",
          deletedAt: new Date(),
        },
      });

      console.log(`[PROVISIONING] Account deleted: ${account.username}`);
      return account;
    } catch (err) {
      console.error(
        `[PROVISIONING ERROR] Failed to delete account ${account.username}:`,
        err.message
      );
      throw err;
    }
  }

  /**
   * Suspend account on non-payment
   * Called by billing module when invoice becomes overdue
   */
  async suspendAccount(orderId, reason = "non-payment") {
    const account = await prisma.hostingAccount.findFirst({
      where: { orderId },
    });

    if (!account) {
      const err = new Error("No hosting account found for this order");
      err.statusCode = 404;
      throw err;
    }

    if (account.status === "suspended") {
      return account; // Already suspended
    }

    try {
      console.log(
        `[PROVISIONING] Suspending account: ${account.username} (${reason})`
      );
      await vestaCPClient.suspendAccount(account.username);

      const updated = await prisma.hostingAccount.update({
        where: { id: account.id },
        data: {
          status: "suspended",
          suspendedAt: new Date(),
          suspendReason: reason,
        },
      });

      console.log(`[PROVISIONING] Account suspended: ${account.username}`);
      return updated;
    } catch (err) {
      console.error(
        `[PROVISIONING ERROR] Failed to suspend ${account.username}:`,
        err.message
      );
      throw err;
    }
  }

  /**
   * Unsuspend account when payment received
   * Called by billing module when invoice status changes to 'paid'
   */
  async unsuspendAccount(orderId) {
    const account = await prisma.hostingAccount.findFirst({
      where: { orderId },
    });

    if (!account) {
      const err = new Error("No hosting account found for this order");
      err.statusCode = 404;
      throw err;
    }

    if (account.status !== "suspended") {
      return account; // Not suspended
    }

    try {
      console.log(`[PROVISIONING] Unsuspending account: ${account.username}`);
      await vestaCPClient.unsuspendAccount(account.username);

      const updated = await prisma.hostingAccount.update({
        where: { id: account.id },
        data: {
          status: "active",
          suspendedAt: null,
          suspendReason: null,
        },
      });

      console.log(`[PROVISIONING] Account unsuspended: ${account.username}`);
      return updated;
    } catch (err) {
      console.error(
        `[PROVISIONING ERROR] Failed to unsuspend ${account.username}:`,
        err.message
      );
      throw err;
    }
  }

  /**
   * Get account by order ID
   */
  async getAccountByOrderId(orderId) {
    const account = await prisma.hostingAccount.findFirst({
      where: { orderId },
    });

    if (!account) {
      const err = new Error("Hosting account not found");
      err.statusCode = 404;
      throw err;
    }

    return account;
  }

  /**
   * Get account by username
   */
  async getAccountByUsername(username) {
    const account = await prisma.hostingAccount.findFirst({
      where: { username },
    });

    if (!account) {
      const err = new Error("Hosting account not found");
      err.statusCode = 404;
      throw err;
    }

    return account;
  }

  /**
   * Sync account usage stats from VestaCP
   * Called periodically by cron job to update disk, bandwidth, etc
   */
  async syncAccountStats(username) {
    try {
      const stats = await vestaCPClient.getUserStats(username);

      await prisma.hostingAccount.update({
        where: { username },
        data: {
          diskUsedMB: stats.stats?.U_DISK || null,
          bandwidthUsedGB: stats.stats?.U_BANDWIDTH || null,
          lastSyncedAt: new Date(),
        },
      });

      return stats;
    } catch (err) {
      console.error(`[SYNC ERROR] Failed to sync ${username}:`, err.message);
      throw err;
    }
  }

  /**
   * Provision domain for existing account
   * Client provides domain after ordering
   */
  async provisionDomain(username, domainData) {
    const account = await prisma.hostingAccount.findFirst({
      where: { username },
    });

    if (!account) {
      const err = new Error("Hosting account not found");
      err.statusCode = 404;
      throw err;
    }

    try {
      console.log(
        `[PROVISIONING] Creating domain ${domainData.domain} for ${username}`
      );
      await vestaCPClient.createDomain(username, domainData);

      // Store domain record
      const domain = await prisma.hostingDomain.create({
        data: {
          hostingAccountId: account.id,
          domain: domainData.domain,
          status: "active",
          createdAt: new Date(),
        },
      });

      // Issue SSL immediately
      try {
        await vestaCPClient.issueSSL(username, domainData.domain);
        await prisma.hostingDomain.update({
          where: { id: domain.id },
          data: { sslStatus: "active" },
        });
      } catch (sslErr) {
        console.warn(
          `[PROVISIONING] SSL issuance delayed for ${domainData.domain}:`,
          sslErr.message
        );
        // Don't fail on SSL error - it might be DNS propagation
      }

      return domain;
    } catch (err) {
      console.error(
        `[PROVISIONING ERROR] Failed to create domain ${domainData.domain}:`,
        err.message
      );
      throw err;
    }
  }

  /**
   * Provision email account
   */
  async provisionEmail(username, domain, emailData) {
    const account = await prisma.hostingAccount.findFirst({
      where: { username },
    });

    if (!account) {
      const err = new Error("Hosting account not found");
      err.statusCode = 404;
      throw err;
    }

    try {
      const fullEmail = `${emailData.account}@${domain}`;
      console.log(`[PROVISIONING] Creating email ${fullEmail}`);

      const password = emailData.password || generateSecurePassword();
      await vestaCPClient.createEmail(username, domain, {
        ...emailData,
        password,
      });

      // Store email record
      const email = await prisma.hostingEmail.create({
        data: {
          hostingAccountId: account.id,
          email: fullEmail,
          password: encryptValue(password),
          quota: emailData.quota || 100,
          status: "active",
        },
      });

      return email;
    } catch (err) {
      console.error(
        `[PROVISIONING ERROR] Failed to create email ${emailData.account}@${domain}:`,
        err.message
      );
      throw err;
    }
  }

  /**
   * Generate unique VestaCP username
   * Format: client-email-orderId (sanitized)
   * Example: john-doe-order-12345
   */
  _generateUsername(email, orderId) {
    const emailPrefix = email
      .split("@")[0]
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()
      .substring(0, 8);

    // VestaCP usernames must be 3-16 chars, alphanumeric and hyphen
    return `${emailPrefix}-${orderId}`.substring(0, 16);
  }

  /**
   * List all accounts for a client
   */
  async getClientAccounts(clientId) {
    return prisma.hostingAccount.findMany({
      where: { clientId },
      include: {
        domains: true,
        emails: true,
      },
    });
  }
}

module.exports = new ProvisioningService();