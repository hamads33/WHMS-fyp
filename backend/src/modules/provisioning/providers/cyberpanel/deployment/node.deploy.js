const {
  buildBashCommand,
  buildEnvFileCommands,
  sanitizeDomain,
  sanitizePath,
  sanitizeUrl,
  shellEscape,
} = require("../utils/commandBuilder");

function buildRepositorySyncCommands(params, appRoot) {
  if (!params.repositoryUrl) {
    throw new Error("Node deployment requires repositoryUrl");
  }

  const repositoryUrl = sanitizeUrl(params.repositoryUrl, "repositoryUrl");
  const branch = params.branch || "main";

  return [
    `mkdir -p ${shellEscape(appRoot)}`,
    `if [ -d ${shellEscape(`${appRoot}/.git`)} ]; then cd ${shellEscape(appRoot)} && git fetch --all --prune && git checkout ${shellEscape(branch)} && git pull --ff-only origin ${shellEscape(branch)}; else git clone --branch ${shellEscape(branch)} ${shellEscape(repositoryUrl)} ${shellEscape(appRoot)}; fi`,
  ];
}

function buildNodeDeployCommand(params) {
  const domain = sanitizeDomain(params.domain);
  const appRoot = sanitizePath(params.deployPath || `/home/${domain}/app`, "deployPath");
  const envFile = `${appRoot}/.env`;
  const installCommand = params.installCommand || "npm install --omit=dev";
  const startCommand = params.startCommand || "npm start";
  const processName = params.processName || domain.replace(/\./g, "-");

  const commands = [
    ...buildRepositorySyncCommands(params, appRoot),
    ...buildEnvFileCommands(params.env || {}, envFile),
    `cd ${shellEscape(appRoot)}`,
    installCommand,
    params.buildCommand || "",
    `pm2 describe ${shellEscape(processName)} >/dev/null 2>&1 && pm2 delete ${shellEscape(processName)} || true`,
    `pm2 start ${shellEscape(startCommand)} --name ${shellEscape(processName)}`,
    "pm2 save",
  ].filter(Boolean);

  return {
    type: "node",
    domain,
    appRoot,
    command: buildBashCommand(commands),
    metadata: {
      processName,
      deployPath: appRoot,
      branch: params.branch || "main",
    },
  };
}

module.exports = {
  buildNodeDeployCommand,
};
