const DOMAIN_RE = /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[A-Za-z]{2,63}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDENTIFIER_RE = /^[a-zA-Z0-9._-]+$/;
const PHP_RE = /^[0-9]+\.[0-9]+$/;
const ENV_KEY_RE = /^[A-Z][A-Z0-9_]*$/;
const URL_RE = /^(https?:\/\/|git@|ssh:\/\/)[^\s]+$/i;

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function assertNonEmpty(value, field) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`"${field}" is required`);
  }
  return String(value).trim();
}

function assertMatch(value, field, regex, message = "contains invalid characters") {
  const normalized = assertNonEmpty(value, field);
  if (!regex.test(normalized)) {
    throw new Error(`"${field}" ${message}`);
  }
  return normalized;
}

function sanitizeDomain(domain) {
  return assertMatch(String(domain || "").toLowerCase(), "domain", DOMAIN_RE, "must be a valid domain");
}

function sanitizeEmail(email) {
  return assertMatch(email, "email", EMAIL_RE, "must be a valid email");
}

function sanitizeIdentifier(value, field = "identifier") {
  return assertMatch(value, field, IDENTIFIER_RE);
}

function sanitizePhpVersion(version) {
  return assertMatch(version || "8.1", "phpVersion", PHP_RE, "must look like 8.1");
}

function sanitizePath(path, field = "path") {
  const normalized = assertNonEmpty(path, field);
  if (/[`\n\r]/.test(normalized)) {
    throw new Error(`"${field}" contains unsupported characters`);
  }
  return normalized;
}

function sanitizeUrl(value, field = "url") {
  return assertMatch(value, field, URL_RE, "must be a supported git/http URL");
}

function sanitizeEnv(env = {}) {
  const pairs = [];
  for (const [key, rawValue] of Object.entries(env)) {
    if (!ENV_KEY_RE.test(key)) {
      throw new Error(`Environment key "${key}" is invalid`);
    }
    pairs.push({ key, value: String(rawValue) });
  }
  return pairs;
}

function buildCyberPanelCommand(commandName, flags = {}) {
  const commandParts = ["cyberpanel", sanitizeIdentifier(commandName, "commandName")];
  for (const [key, value] of Object.entries(flags)) {
    if (value === undefined || value === null || value === "") continue;
    commandParts.push(`--${sanitizeIdentifier(key, `flag:${key}`)}`, shellEscape(String(value)));
  }
  return commandParts.join(" ");
}

function buildBashCommand(commands) {
  const script = commands.filter(Boolean).join("\n");
  return `bash -lc ${shellEscape(`set -euo pipefail\n${script}`)}`;
}

function buildEnvExportCommands(env) {
  return sanitizeEnv(env).map(({ key, value }) => `export ${key}=${shellEscape(value)}`);
}

function buildEnvFileCommands(env, filePath) {
  const safePath = sanitizePath(filePath, "envFilePath");
  const commands = [`mkdir -p ${shellEscape(require("path").dirname(safePath))}`, `: > ${shellEscape(safePath)}`];
  for (const { key, value } of sanitizeEnv(env)) {
    commands.push(`printf '%s\\n' ${shellEscape(`${key}=${value}`)} >> ${shellEscape(safePath)}`);
  }
  return commands;
}

module.exports = {
  shellEscape,
  sanitizeDomain,
  sanitizeEmail,
  sanitizeIdentifier,
  sanitizePhpVersion,
  sanitizePath,
  sanitizeUrl,
  sanitizeEnv,
  buildCyberPanelCommand,
  buildBashCommand,
  buildEnvExportCommands,
  buildEnvFileCommands,
};
