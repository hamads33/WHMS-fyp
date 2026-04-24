/**
 * domain-registrar/plugin.js
 *
 * Core domain plugin — wraps the domains module so it participates
 * in the plugin lifecycle (service container, hooks).
 *
 * Routes mounted:
 *   /api/domains        — user routes (availability, register, transfer, WHOIS)
 *   /api/admin/domains  — admin domain management, DNS, settings
 *
 * Services registered in container:
 *   domain:service   — checkAvailability, registerDomain
 *   domain:admin     — admin domain operations
 *   domain:dns       — DNS record management
 *   domain:transfer  — EPP transfer management
 *
 * Hooks fired (via domain.service.js):
 *   domain.registered — after a domain is successfully provisioned
 *
 * Registrar credentials (Porkbun, Namecheap) are stored in the
 * DomainSetting DB table and managed via /api/admin/domains/settings.
 * The configSchema below surfaces them in Admin → Settings so admins
 * can also manage them from that central page.
 */

const domainRoutes      = require("../../modules/domains/index");
const domainService     = require("../../modules/domains/domain/core/domain.service");
const domainAdminService = require("../../modules/domains/domain/core/domain.admin.service");
const domainDnsService  = require("../../modules/domains/domain/core/domain.dns.service");
const domainTransfer    = require("../../modules/domains/domain/core/domain.transfer");
const domainSettings    = require("../../modules/domains/services/domain-settings.service");

module.exports = {
  meta: {
    name        : "domain-registrar",
    version     : "1.0.0",
    description : "Domain registration, DNS management, and multi-registrar integration (Porkbun, Namecheap)",
    capabilities: ["api", "hooks"],

    // Registrar credentials surfaced in Admin → Settings → Domain Registrar tab.
    // Values are written back to the DomainSetting DB table on save (see boot).
    configSchema: [
      // ── Porkbun ──────────────────────────────────────────────────
      {
        key        : "porkbun_api_key",
        label      : "Porkbun API Key",
        type       : "password",
        placeholder: "pk1_…",
        description: "Porkbun API key for domain registration",
      },
      {
        key        : "porkbun_secret_key",
        label      : "Porkbun Secret Key",
        type       : "password",
        placeholder: "sk1_…",
      },
      {
        key        : "porkbun_enabled",
        label      : "Enable Porkbun",
        type       : "toggle",
        description: "Allow Porkbun as a registrar option",
      },
      // ── Namecheap ────────────────────────────────────────────────
      {
        key        : "namecheap_api_key",
        label      : "Namecheap API Key",
        type       : "password",
      },
      {
        key        : "namecheap_api_user",
        label      : "Namecheap Username",
        type       : "text",
        placeholder: "your-namecheap-username",
      },
      {
        key        : "namecheap_client_ip",
        label      : "Namecheap Whitelisted IP",
        type       : "text",
        description: "Server IP whitelisted in your Namecheap API settings",
      },
      {
        key        : "namecheap_sandbox",
        label      : "Namecheap Sandbox Mode",
        type       : "toggle",
        description: "Use Namecheap sandbox for testing (no real domains registered)",
      },
      {
        key        : "namecheap_enabled",
        label      : "Enable Namecheap",
        type       : "toggle",
        description: "Allow Namecheap as a registrar option",
      },
    ],
  },

  async register(ctx) {
    const { services, config, app, logger } = ctx;

    // ── Seed plugin config from DomainSetting DB ──────────────────
    // On first load, pull existing DB credentials into pluginConfigStore
    // so the Settings form pre-fills with whatever was previously saved.
    try {
      const stored = await domainSettings.getRawCategory("porkbun");
      const stored2 = await domainSettings.getRawCategory("namecheap");
      for (const [key, val] of Object.entries({ ...stored, ...stored2 })) {
        if (val && !config.get(key)) config.set(key, val);
      }
    } catch (err) {
      logger.warn("[domain-registrar] Could not seed config from DB:", err.message);
    }

    // ── Service container registration ────────────────────────────
    services.register("domain:service",   domainService);
    services.register("domain:admin",     domainAdminService);
    services.register("domain:dns",       domainDnsService);
    services.register("domain:transfer",  domainTransfer);

    // ── Route mounting ────────────────────────────────────────────
    if (app) {
      app.use("/api", domainRoutes);
      logger.info("[domain-registrar] Routes mounted at /api/domains and /api/admin/domains");
    }

    logger.info("[domain-registrar] Plugin registered");
  },

  async boot(ctx) {
    const { config, logger } = ctx;

    // ── Sync plugin config → DomainSetting DB ────────────────────
    // Any credentials set via configSchema / PluginConfigPanel are
    // written back to DomainSetting so the existing registrar loaders
    // (porkbun/, namecheap/) continue to find them in the DB.
    const configKeys = this.meta.configSchema.map(f => f.key);
    for (const key of configKeys) {
      const val = config.get(key);
      if (val && val !== "••••••••") {
        try {
          await domainSettings.setSetting(key, val);
        } catch (err) {
          logger.warn(`[domain-registrar] Could not sync config key "${key}" to DB:`, err.message);
        }
      }
    }

    logger.info("[domain-registrar] Plugin booted — registrar config synced");
  },

  shutdown(ctx) {
    ctx.logger.info("[domain-registrar] Plugin shutting down");
  },
};
