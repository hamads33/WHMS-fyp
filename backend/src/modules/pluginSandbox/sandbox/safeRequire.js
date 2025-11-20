// src/modules/pluginSandbox/sandbox/safeRequire.js

const ALLOWED = {
  "axios": require("axios"),
  "dayjs": require("dayjs"),
  "lodash": require("lodash"),
};

function safeRequire(name) {
  if (!ALLOWED[name]) {
    throw new Error(`Module '${name}' is not allowed in sandbox`);
  }
  return ALLOWED[name];
}

module.exports = safeRequire;
