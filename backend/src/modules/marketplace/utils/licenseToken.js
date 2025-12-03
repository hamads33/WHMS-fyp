const crypto = require('crypto');

const LicenseToken = {
  generate(payload = {}) {
    // returns a uuid-like token; you can include encrypted payload in production
    const raw = JSON.stringify({ payload, ts: Date.now() });
    return crypto.createHash('sha256').update(raw + Math.random()).digest('hex').substring(0, 32).toUpperCase();
  }
};

module.exports = LicenseToken;
