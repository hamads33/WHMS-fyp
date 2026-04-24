const crypto = require('crypto');

function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

module.exports = { generateSecureToken };
