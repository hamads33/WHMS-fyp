const {
  buildBashCommand,
  buildEnvFileCommands,
  sanitizeDomain,
  sanitizePath,
  sanitizeUrl,
  shellEscape,
} = require("../utils/commandBuilder");

function buildLaravelDeployCommand(params) {
  if (!params.repositoryUrl) {
    throw new Error("Laravel deployment requires repositoryUrl");
  }

  const domain = sanitizeDomain(params.domain);
  const appRoot = sanitizePath(params.deployPath || `/home/${domain}/app`, "deployPath");
  const repositoryUrl = sanitizeUrl(params.repositoryUrl, "repositoryUrl");
  const branch = params.branch || "main";
  const composerInstall = params.composerNoDev === false
    ? "composer install --no-interaction --prefer-dist"
    : "composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader";

  const commands = [
    `mkdir -p ${shellEscape(appRoot)}`,
    `if [ -d ${shellEscape(`${appRoot}/.git`)} ]; then cd ${shellEscape(appRoot)} && git fetch --all --prune && git checkout ${shellEscape(branch)} && git pull --ff-only origin ${shellEscape(branch)}; else git clone --branch ${shellEscape(branch)} ${shellEscape(repositoryUrl)} ${shellEscape(appRoot)}; fi`,
    `cd ${shellEscape(appRoot)}`,
    composerInstall,
    `if [ ! -f .env ] && [ -f .env.example ]; then cp .env.example .env; fi`,
    ...buildEnvFileCommands(params.env || {}, `${appRoot}/.env`),
    "php artisan key:generate --force || true",
    params.runMigrations === false ? "" : "php artisan migrate --force",
    "php artisan optimize:clear",
    "php artisan config:cache",
    "php artisan route:cache || true",
    "php artisan view:cache || true",
  ].filter(Boolean);

  return {
    type: "laravel",
    domain,
    appRoot,
    command: buildBashCommand(commands),
    metadata: {
      deployPath: appRoot,
      branch,
      migrations: params.runMigrations !== false,
    },
  };
}

module.exports = {
  buildLaravelDeployCommand,
};
