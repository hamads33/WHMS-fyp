// dependency-installer.service.js
// Auto-installs dependencies based on manifest.json

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports = {
  installDependencies: async ({ productId, manifest, pluginFolder }) => {
    const deps = manifest.dependencies || [];

    if (!deps || deps.length === 0) {
      return { success: true, message: "No dependencies" };
    }

    const results = [];

    for (const dep of deps) {
      try {
        execSync(`npm install ${dep}`, {
          cwd: pluginFolder,
          stdio: "inherit",
        });

        results.push({ dep, success: true });
      } catch (err) {
        results.push({ dep, success: false, error: err.message });
      }
    }

    return { success: true, results };
  },
};
