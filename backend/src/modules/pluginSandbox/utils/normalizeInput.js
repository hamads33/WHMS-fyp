// src/pluginSandbox/utils/normalizeInput.js
module.exports = function normalizeInput(input) {
  if (!input || typeof input !== "object") return {};

  const clean = JSON.parse(JSON.stringify(input));

  // normalize legacy email plugins
  if (clean.message && !clean.body) {
    clean.body = clean.message;
  }

  return clean;
};
