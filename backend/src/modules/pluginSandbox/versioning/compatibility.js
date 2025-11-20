// src/pluginSandbox/versioning/compatibility.js
const { gt } = require("./semver");

module.exports = {
  isCompatible(pluginVersion, minRequired) {
    if (!pluginVersion) return false;
    if (!minRequired) return true;
    return !gt(minRequired, pluginVersion);
  }
};
