// src/modules/pluginSandbox/sandbox/safeGlobals.js

module.exports = {
  Math,
  Date,
  JSON,
  URL,
  fetch: global.fetch, // Allowed for Option C
};
