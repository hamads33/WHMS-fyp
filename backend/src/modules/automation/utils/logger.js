// src/modules/automation/utils/logger.js
// module-local logger (simple, replaceable)

// src/modules/automation/utils/logger.js
const util = require("util");

function timestamp() {
  return new Date().toISOString();
}

function formatMessage(level, msg, meta) {
  const ctx = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp()}] [${level.toUpperCase()}] ${msg}${ctx}`;
}

function log(msg, meta) {
  console.log(formatMessage("info", msg, meta));
}

function warn(msg, meta) {
  console.warn(formatMessage("warn", msg, meta));
}

function error(msg, meta) {
  console.error(formatMessage("error", msg, meta));
}

function debug(msg, meta) {
  if (process.env.DEBUG === "1") {
    console.debug(formatMessage("debug", msg, meta));
  }
}

module.exports = {
  log,
  warn,
  error,
  debug
};
