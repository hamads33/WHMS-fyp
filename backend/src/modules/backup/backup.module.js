/**
 * Exports a function that mounts routes into an express app and starts the backup worker.
 * Use from your app like:
 *
 * const express = require('express');
 * const app = express();
 * const backupModule = require('./src/modules/backup/backup.module');
 * app.use('/api/backups', backupModule({ app, db, redis }));
 *
 */
/**
 * Backup Module
 * Provides .init() to start worker, same pattern as automationModule.init()
 */

const { workerInstance } = require("./workers/backupCron.worker");

module.exports = {
  init() {
    console.log("[Backup] Worker initialized");
    // Worker starts on require(), nothing else needed
  },
};
