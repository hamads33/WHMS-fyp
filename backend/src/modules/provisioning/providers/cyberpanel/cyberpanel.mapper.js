const { CYBERPANEL_COMMANDS } = require("./cyberpanel.commands");
const {
  buildCyberPanelCommand,
  sanitizeDomain,
  sanitizeEmail,
  sanitizeIdentifier,
  sanitizePhpVersion,
} = require("./utils/commandBuilder");
const { buildNodeDeployCommand } = require("./deployment/node.deploy");
const { buildLaravelDeployCommand } = require("./deployment/laravel.deploy");
const { buildStaticDeployCommand } = require("./deployment/static.deploy");

function mapCreateSiteCommand(params) {
  const domain = sanitizeDomain(params.domain);
  const email = sanitizeEmail(params.email);
  const phpVersion = sanitizePhpVersion(params.phpVersion || "8.1");
  const command = buildCyberPanelCommand(CYBERPANEL_COMMANDS.CREATE_SITE, {
    domainName: domain,
    email,
    php: phpVersion,
  });

  return {
    domain,
    command,
    metadata: {
      phpVersion,
      packageName: params.packageName || null,
    },
  };
}

function mapDeleteSiteCommand(domain) {
  const normalizedDomain = sanitizeDomain(domain);
  return {
    domain: normalizedDomain,
    command: buildCyberPanelCommand(CYBERPANEL_COMMANDS.DELETE_SITE, {
      domainName: normalizedDomain,
    }),
  };
}

function mapInstallSslCommand(domain) {
  const normalizedDomain = sanitizeDomain(domain);
  return {
    domain: normalizedDomain,
    command: buildCyberPanelCommand(CYBERPANEL_COMMANDS.ISSUE_SSL, {
      domainName: normalizedDomain,
    }),
  };
}

function mapCreateDatabaseCommand(params) {
  if (!params.password) {
    throw new Error("database password is required");
  }

  return {
    name: sanitizeIdentifier(params.name, "databaseName"),
    user: sanitizeIdentifier(params.user, "databaseUser"),
    command: buildCyberPanelCommand(CYBERPANEL_COMMANDS.CREATE_DATABASE, {
      dbName: sanitizeIdentifier(params.name, "databaseName"),
      dbUser: sanitizeIdentifier(params.user, "databaseUser"),
      password: String(params.password),
    }),
  };
}

function mapDeploymentCommand(params) {
  const type = String(params.type || "").toLowerCase();
  if (type === "node") return buildNodeDeployCommand(params);
  if (type === "laravel") return buildLaravelDeployCommand(params);
  if (type === "static") return buildStaticDeployCommand(params);
  throw new Error(`Unsupported deployment type: "${params.type}"`);
}

function mapListSitesCommand() {
  return buildCyberPanelCommand(CYBERPANEL_COMMANDS.LIST_SITES);
}

module.exports = {
  mapCreateSiteCommand,
  mapDeleteSiteCommand,
  mapInstallSslCommand,
  mapCreateDatabaseCommand,
  mapDeploymentCommand,
  mapListSitesCommand,
};
