const prisma = require("../../../../../prisma");
const HostingProvider = require("../hosting.provider");
const AuditLoggerService = require("../../../audit/audit-logger.service");
const serverLogRepo = require("../../../server-management/repositories/server-log.repository");
const { CYBERPANEL_LOG_ACTIONS } = require("./cyberpanel.commands");
const {
  mapCreateSiteCommand,
  mapDeleteSiteCommand,
  mapInstallSslCommand,
  mapCreateDatabaseCommand,
  mapDeploymentCommand,
  mapListSitesCommand,
} = require("./cyberpanel.mapper");
const {
  normalizeExecutionResult,
  detectCyberPanelSuccess,
  normalizeProviderError,
  extractWebsiteDomains,
} = require("./utils/responseParser");
const { executeWithRetry } = require("./utils/retryHandler");

function createFallbackLogger() {
  return {
    info(payload, meta) {
      if (typeof payload === "object") console.log(JSON.stringify(payload));
      else console.log(payload, meta || "");
    },
    warn(payload, meta) {
      if (typeof payload === "object") console.warn(JSON.stringify(payload));
      else console.warn(payload, meta || "");
    },
    error(payload, meta) {
      if (typeof payload === "object") console.error(JSON.stringify(payload));
      else console.error(payload, meta || "");
    },
  };
}

function resolveAuditLogger(explicitLogger, logger) {
  if (explicitLogger) return explicitLogger;
  if (global.__whmsApp?.locals?.auditLogger) return global.__whmsApp.locals.auditLogger;
  return new AuditLoggerService({ prisma, logger });
}

class CyberPanelProvider extends HostingProvider {
  constructor(options = {}) {
    super();
    if (!options.provisioningModule || typeof options.provisioningModule.execute !== "function") {
      throw new Error('CyberPanelProvider requires a provisioningModule with execute(serverId, command)');
    }

    this.providerId = "cyberpanel";
    this.provisioningModule = options.provisioningModule;
    this.defaultServerId = options.defaultServerId || null;
    this.prisma = options.prismaClient || prisma;
    this.logger = options.logger || createFallbackLogger();
    this.auditLogger = resolveAuditLogger(options.auditLogger, this.logger);
    this.serverLogRepo = options.serverLogRepo || serverLogRepo;
    this.retryOptions = {
      retries: Number(options.retries ?? 2),
      baseDelayMs: Number(options.baseDelayMs ?? 1000),
      factor: Number(options.retryFactor ?? 2),
      timeoutMs: Number(options.commandTimeoutMs ?? 60000),
    };
  }

  _resolveServerId(serverId) {
    const resolved = serverId || this.defaultServerId;
    if (!resolved) {
      throw new Error("serverId is required for CyberPanel operations");
    }
    return resolved;
  }

  async _writeOperationLog({ serverId, action, status, message, meta = null, level = "INFO" }) {
    const logPayload = {
      provider: this.providerId,
      serverId,
      action,
      status,
      level,
      message,
      meta,
      timestamp: new Date().toISOString(),
    };

    if (level === "ERROR") this.logger.error(logPayload);
    else if (level === "WARN") this.logger.warn(logPayload);
    else this.logger.info(logPayload);

    try {
      await this.serverLogRepo.create({
        serverId,
        action: `${action}_${status}`.toUpperCase(),
        message,
      });
    } catch (error) {
      this.logger.warn({
        provider: this.providerId,
        action: "CYBERPANEL_SERVER_LOG_WRITE",
        status: "FAILED",
        message: error.message,
      });
    }

    try {
      await this.auditLogger.log({
        source: "provisioning",
        action,
        actor: "system",
        level,
        entity: "Server",
        entityId: serverId,
        meta: {
          provider: this.providerId,
          status,
          ...meta,
        },
      });
    } catch (error) {
      this.logger.warn({
        provider: this.providerId,
        action: "CYBERPANEL_AUDIT_LOG_WRITE",
        status: "FAILED",
        message: error.message,
      });
    }
  }

  async _execute(serverId, command, action, meta = {}) {
    const resolvedServerId = this._resolveServerId(serverId);

    await this._writeOperationLog({
      serverId: resolvedServerId,
      action,
      status: "STARTED",
      message: `${action} started`,
      meta: {
        ...meta,
        command,
      },
    });

    try {
      const rawResult = await executeWithRetry(
        () => this.provisioningModule.execute(resolvedServerId, command),
        {
          ...this.retryOptions,
          onRetry: async ({ attempt, nextAttempt, error }) => {
            await this._writeOperationLog({
              serverId: resolvedServerId,
              action,
              status: "RETRYING",
              level: "WARN",
              message: `${action} attempt ${attempt} failed, retrying attempt ${nextAttempt}`,
              meta: {
                ...meta,
                command,
                error: error.message,
              },
            });
          },
        }
      );

      const normalized = normalizeExecutionResult(rawResult);
      await this._writeOperationLog({
        serverId: resolvedServerId,
        action,
        status: "SUCCEEDED",
        message: `${action} completed`,
        meta: {
          ...meta,
          command,
          code: normalized.code,
        },
      });
      return normalized;
    } catch (error) {
      await this._writeOperationLog({
        serverId: resolvedServerId,
        action,
        status: "FAILED",
        level: "ERROR",
        message: `${action} failed: ${error.message}`,
        meta: {
          ...meta,
          command,
          error: error.message,
        },
      });
      throw normalizeProviderError(error, { serverId: resolvedServerId, action, meta });
    }
  }

  async _markWebsiteState({ domain, userId, websiteId, status }) {
    try {
      if (websiteId) {
        await this.prisma.website.update({
          where: { id: websiteId },
          data: { status },
        });
        return;
      }

      if (!userId) return;
      const existing = await this.prisma.website.findFirst({
        where: { domain, userId },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        await this.prisma.website.update({
          where: { id: existing.id },
          data: { status },
        });
      } else if (status === "active") {
        await this.prisma.website.create({
          data: {
            domain,
            userId,
            status,
          },
        });
      }
    } catch (error) {
      this.logger.warn({
        provider: this.providerId,
        action: "CYBERPANEL_WEBSITE_STATE_UPDATE",
        status: "FAILED",
        message: error.message,
      });
    }
  }

  async _markHostingDomainState({ domain, hostingAccountId, status, sslStatus = undefined }) {
    if (!hostingAccountId) return;
    try {
      const existing = await this.prisma.hostingDomain.findFirst({
        where: { hostingAccountId, domain },
      });

      if (existing) {
        await this.prisma.hostingDomain.update({
          where: { id: existing.id },
          data: {
            status,
            ...(sslStatus !== undefined ? { sslStatus } : {}),
          },
        });
      } else if (status === "active") {
        await this.prisma.hostingDomain.create({
          data: {
            hostingAccountId,
            domain,
            status,
            ...(sslStatus !== undefined ? { sslStatus } : {}),
          },
        });
      }
    } catch (error) {
      this.logger.warn({
        provider: this.providerId,
        action: "CYBERPANEL_HOSTING_DOMAIN_STATE_UPDATE",
        status: "FAILED",
        message: error.message,
      });
    }
  }

  async createSite(params) {
    const serverId = this._resolveServerId(params.serverId);
    const mapped = mapCreateSiteCommand(params);
    const result = await this._execute(serverId, mapped.command, CYBERPANEL_LOG_ACTIONS.CREATE_SITE, {
      domain: mapped.domain,
    });

    await this._markWebsiteState({
      domain: mapped.domain,
      websiteId: params.websiteId,
      userId: params.userId,
      status: "active",
    });
    await this._markHostingDomainState({
      domain: mapped.domain,
      hostingAccountId: params.hostingAccountId,
      status: "active",
    });

    return {
      success: detectCyberPanelSuccess(result) || result.success,
      domain: mapped.domain,
      status: "created",
      command: mapped.command,
      output: result.output,
      metadata: mapped.metadata,
    };
  }

  async deleteSite(domain, options = {}) {
    const serverId = this._resolveServerId(options.serverId);
    const mapped = mapDeleteSiteCommand(domain);
    const result = await this._execute(serverId, mapped.command, CYBERPANEL_LOG_ACTIONS.DELETE_SITE, {
      domain: mapped.domain,
    });

    await this._markWebsiteState({
      domain: mapped.domain,
      websiteId: options.websiteId,
      userId: options.userId,
      status: "deleted",
    });
    await this._markHostingDomainState({
      domain: mapped.domain,
      hostingAccountId: options.hostingAccountId,
      status: "deleted",
    });

    return {
      success: detectCyberPanelSuccess(result) || result.success,
      domain: mapped.domain,
      status: "deleted",
      command: mapped.command,
      output: result.output,
    };
  }

  async deployApp(params) {
    const serverId = this._resolveServerId(params.serverId);
    const mapped = mapDeploymentCommand(params);
    const result = await this._execute(serverId, mapped.command, CYBERPANEL_LOG_ACTIONS.DEPLOY_APP, {
      domain: mapped.domain,
      deploymentType: mapped.type,
    });

    await this._markWebsiteState({
      domain: mapped.domain,
      websiteId: params.websiteId,
      userId: params.userId,
      status: "active",
    });
    await this._markHostingDomainState({
      domain: mapped.domain,
      hostingAccountId: params.hostingAccountId,
      status: "active",
    });

    return {
      success: result.success,
      type: mapped.type,
      domain: mapped.domain,
      status: "deployed",
      command: mapped.command,
      output: result.output,
      metadata: mapped.metadata,
    };
  }

  async installSSL(domain, options = {}) {
    const serverId = this._resolveServerId(options.serverId);
    const mapped = mapInstallSslCommand(domain);
    const result = await this._execute(serverId, mapped.command, CYBERPANEL_LOG_ACTIONS.INSTALL_SSL, {
      domain: mapped.domain,
    });

    await this._markHostingDomainState({
      domain: mapped.domain,
      hostingAccountId: options.hostingAccountId,
      status: "active",
      sslStatus: "active",
    });

    return {
      success: detectCyberPanelSuccess(result) || result.success,
      domain: mapped.domain,
      status: "installed",
      command: mapped.command,
      output: result.output,
    };
  }

  async createDatabase(params) {
    const serverId = this._resolveServerId(params.serverId);
    const mapped = mapCreateDatabaseCommand(params);
    const result = await this._execute(serverId, mapped.command, CYBERPANEL_LOG_ACTIONS.CREATE_DATABASE, {
      domain: params.domain,
      databaseName: mapped.name,
    });

    if (params.hostingAccountId) {
      try {
        const existing = await this.prisma.hostingDatabase.findFirst({
          where: {
            hostingAccountId: params.hostingAccountId,
            name: mapped.name,
          },
        });

        if (!existing) {
          await this.prisma.hostingDatabase.create({
            data: {
              hostingAccountId: params.hostingAccountId,
              name: mapped.name,
              dbUser: mapped.user,
              dbPassword: String(params.password),
              status: "active",
            },
          });
        }
      } catch (error) {
        this.logger.warn({
          provider: this.providerId,
          action: "CYBERPANEL_DATABASE_STATE_UPDATE",
          status: "FAILED",
          message: error.message,
        });
      }
    }

    return {
      success: detectCyberPanelSuccess(result) || result.success,
      name: mapped.name,
      user: mapped.user,
      status: "created",
      command: mapped.command,
      output: result.output,
    };
  }

  async executeRaw(serverId, command) {
    const result = await this._execute(serverId, command, CYBERPANEL_LOG_ACTIONS.EXECUTE_RAW);
    return result.output;
  }

  async syncCyberPanelState(serverId) {
    const resolvedServerId = this._resolveServerId(serverId);
    const command = mapListSitesCommand();
    const result = await this._execute(resolvedServerId, command, CYBERPANEL_LOG_ACTIONS.SYNC_STATE);
    const domains = [...new Set(extractWebsiteDomains(result).map((domain) => String(domain).toLowerCase()))];

    const [managedAccounts, hostingDomains, websites] = await Promise.all([
      this.prisma.serverManagedAccount.findMany({ where: { serverId: resolvedServerId } }),
      this.prisma.hostingDomain.findMany(),
      this.prisma.website.findMany(),
    ]);

    const actualDomainSet = new Set(domains);
    const managedDomainSet = new Set(
      managedAccounts.map((entry) => String(entry.domain).toLowerCase())
    );
    const missingOnServer = [];
    const missingInWhms = [];

    for (const account of managedAccounts) {
      const isPresent = actualDomainSet.has(String(account.domain).toLowerCase());
      if (!isPresent) {
        missingOnServer.push(account.domain);
      }

      await this.prisma.serverManagedAccount.update({
        where: { id: account.id },
        data: {
          status: isPresent ? "active" : "missing_on_server",
          lastUsageSyncAt: new Date(),
        },
      });
    }

    for (const domainRecord of hostingDomains) {
      if (!managedDomainSet.has(String(domainRecord.domain).toLowerCase())) continue;
      const isPresent = actualDomainSet.has(String(domainRecord.domain).toLowerCase());
      await this.prisma.hostingDomain.update({
        where: { id: domainRecord.id },
        data: { status: isPresent ? "active" : "missing_on_server" },
      });
    }

    for (const website of websites) {
      if (!managedDomainSet.has(String(website.domain).toLowerCase())) continue;
      const isPresent = actualDomainSet.has(String(website.domain).toLowerCase());
      await this.prisma.website.update({
        where: { id: website.id },
        data: { status: isPresent ? "active" : "missing_on_server" },
      });
    }

    const knownDomainSet = managedDomainSet;

    for (const domain of domains) {
      if (!knownDomainSet.has(domain.toLowerCase())) {
        missingInWhms.push(domain);
      }
    }

    await this._writeOperationLog({
      serverId: resolvedServerId,
      action: CYBERPANEL_LOG_ACTIONS.SYNC_STATE,
      status: "RECONCILED",
      message: `Reconciled CyberPanel state for ${resolvedServerId}`,
      meta: {
        actualDomains: domains.length,
        missingOnServer,
        missingInWhms,
      },
    });

    return {
      serverId: resolvedServerId,
      provider: this.providerId,
      actualDomains: domains,
      missingOnServer,
      missingInWhms,
      driftDetected: missingOnServer.length > 0 || missingInWhms.length > 0,
      syncedAt: new Date().toISOString(),
    };
  }
}

function createCyberPanelProvider(options = {}) {
  return new CyberPanelProvider(options);
}

async function syncCyberPanelState(serverId, options = {}) {
  const provider = createCyberPanelProvider(options);
  return provider.syncCyberPanelState(serverId);
}

module.exports = {
  CyberPanelProvider,
  createCyberPanelProvider,
  syncCyberPanelState,
};
