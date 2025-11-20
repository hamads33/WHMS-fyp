// src/pluginSandbox/security/signatureVerifier.js
const { sha256File } = require("./checksum");
const fs = require("fs");
const path = require("path");

module.exports = {
  /**
   * Verifies signature.sha256 exists and matches index.js
   */
  verifySignature(pluginDir) {
    try {
      const sigPath = path.join(pluginDir, "signature.sha256");
      const indexPath = path.join(pluginDir, "index.js");

      if (!fs.existsSync(sigPath) || !fs.existsSync(indexPath)) {
        return { ok: false, message: "Missing signature file" };
      }

      const expected = fs.readFileSync(sigPath, "utf8").trim();
      const actual = sha256File(indexPath);

      if (expected !== actual) {
        return { ok: false, message: "Signature mismatch" };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }
};
