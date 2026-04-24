const {
  buildBashCommand,
  sanitizeDomain,
  sanitizePath,
  sanitizeUrl,
  shellEscape,
} = require("../utils/commandBuilder");

function buildStaticDeployCommand(params) {
  const domain = sanitizeDomain(params.domain);
  const targetRoot = sanitizePath(params.deployPath || `/home/${domain}/public_html`, "deployPath");
  const releaseRoot = sanitizePath(params.releasePath || `/home/${domain}/releases/static`, "releasePath");
  const buildDirectory = params.buildDirectory || ".";

  let sourceCommands;
  if (params.repositoryUrl) {
    const repositoryUrl = sanitizeUrl(params.repositoryUrl, "repositoryUrl");
    const branch = params.branch || "main";
    sourceCommands = [
      `rm -rf ${shellEscape(releaseRoot)}`,
      `git clone --branch ${shellEscape(branch)} ${shellEscape(repositoryUrl)} ${shellEscape(releaseRoot)}`,
      `cd ${shellEscape(releaseRoot)}`,
      params.installCommand || "",
      params.buildCommand || "",
      `mkdir -p ${shellEscape(targetRoot)}`,
      `rsync -a --delete ${shellEscape(`${releaseRoot}/${buildDirectory}/`)} ${shellEscape(`${targetRoot}/`)}`,
    ];
  } else if (params.archiveUrl) {
    const archiveUrl = sanitizeUrl(params.archiveUrl, "archiveUrl");
    sourceCommands = [
      `rm -rf ${shellEscape(releaseRoot)}`,
      `mkdir -p ${shellEscape(releaseRoot)}`,
      `curl -fsSL ${shellEscape(archiveUrl)} -o ${shellEscape(`${releaseRoot}/site.tar.gz`)}`,
      `tar -xzf ${shellEscape(`${releaseRoot}/site.tar.gz`)} -C ${shellEscape(releaseRoot)}`,
      `mkdir -p ${shellEscape(targetRoot)}`,
      `rsync -a --delete ${shellEscape(`${releaseRoot}/${buildDirectory}/`)} ${shellEscape(`${targetRoot}/`)}`,
    ];
  } else if (params.sourcePath) {
    const sourcePath = sanitizePath(params.sourcePath, "sourcePath");
    sourceCommands = [
      `mkdir -p ${shellEscape(targetRoot)}`,
      `rsync -a --delete ${shellEscape(`${sourcePath.replace(/\/$/, "")}/`)} ${shellEscape(`${targetRoot}/`)}`,
    ];
  } else {
    throw new Error("Static deployment requires repositoryUrl, archiveUrl, or sourcePath");
  }

  return {
    type: "static",
    domain,
    appRoot: targetRoot,
    command: buildBashCommand(sourceCommands.filter(Boolean)),
    metadata: {
      deployPath: targetRoot,
      releasePath: releaseRoot,
      buildDirectory,
    },
  };
}

module.exports = {
  buildStaticDeployCommand,
};
