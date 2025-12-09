// src/modules/backup/pluginHooks.js
module.exports = [
  "backup.queued",
  "backup.started",
  "backup.success",
  "backup.failed",
  "backup.restore.started",
  "backup.restore.success",
  "backup.restore.failed",
  "backup.retention.deleted"
];

// Your main plugin system can load these automatically:
// const backupHooks = require("../backup/pluginHooks");
// pluginSystem.registerSupportedHooks(backupHooks);
