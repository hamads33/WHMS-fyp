// src/pluginSandbox/security/checksum.js
const crypto = require("crypto");
const fs = require("fs");

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256String(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

module.exports = {
  sha256File,
  sha256String
};
