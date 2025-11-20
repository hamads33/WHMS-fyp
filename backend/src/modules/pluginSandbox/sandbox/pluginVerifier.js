// src/modules/pluginSandbox/pluginVerifier.js
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

/**
 * Compute SHA256 hex of a file (sync for simplicity)
 */
function sha256OfFile(filePath) {
  const data = fs.readFileSync(filePath);
  const h = crypto.createHash('sha256');
  h.update(data);
  return h.digest('hex');
}

/**
 * Validate manifest signature: compare manifest.signature with sha256(index.js)
 * manifest: object
 * pluginFolder: folder containing index.js
 */
function validateSignature(manifest, pluginFolder) {
  if (!manifest || !manifest.signature) return { ok: false, reason: 'no-signature' };

  const indexPath = path.join(pluginFolder, 'index.js');
  if (!fs.existsSync(indexPath)) return { ok: false, reason: 'missing-index' };

  const sum = sha256OfFile(indexPath);
  return { ok: sum === manifest.signature, expected: manifest.signature, actual: sum };
}

module.exports = { sha256OfFile, validateSignature };
