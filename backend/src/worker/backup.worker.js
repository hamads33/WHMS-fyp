console.log("Starting Backup & Restore Workers...");

// backup job worker
require("../modules/backup/worker/runner");

// restore worker
require("../modules/backup/worker/restoreQueue");

// retention cleanup worker
require("../modules/backup/worker/retentionRunner");

console.log("Backup workers initialized.");
