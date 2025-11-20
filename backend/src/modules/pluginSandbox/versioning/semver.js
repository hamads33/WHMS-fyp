// src/pluginSandbox/versioning/semver.js
function parse(v) {
  const [major, minor, patch] = v.split(".").map(Number);
  return { major, minor, patch };
}

function gt(a, b) {
  const A = parse(a), B = parse(b);
  if (A.major > B.major) return true;
  if (A.major < B.major) return false;
  if (A.minor > B.minor) return true;
  if (A.minor < B.minor) return false;
  return A.patch > B.patch;
}

module.exports = { parse, gt };
