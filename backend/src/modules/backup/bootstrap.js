// src/modules/backup/bootstrap.js
const { registerBackupProvider } = require("./provider/registry");

const LocalProvider = require("./provider/local.provider");
const S3Provider = require("./provider/s3.provider");
const SftpProvider = require("./provider/sftp.provider");

// Built-in providers
registerBackupProvider({
  id: "local",
  label: "Local Storage",
  schema: { localPath: { type: "string", required: false } },
  ProviderClass: LocalProvider
});

registerBackupProvider({
  id: "s3",
  label: "Amazon S3",
  schema: {
    accessKeyId: { type: "string" },
    secretAccessKey: { type: "string" },
    region: { type: "string" },
    bucket: { type: "string" }
  },
  ProviderClass: S3Provider
});

registerBackupProvider({
  id: "sftp",
  label: "SFTP",
  schema: {
    host: { type: "string" },
    port: { type: "number" },
    user: { type: "string" },
    password: { type: "string" }
  },
  ProviderClass: SftpProvider
});
const eventBus = require("./eventBus");

module.exports.registerBackupAuditHooks = function ({ auditLogger }) {
  if (!auditLogger) {
    console.warn("[Backup] Audit logger not available");
    return;
  }

  eventBus.on("backup.queued", ({ backupId, userId }) => {
    auditLogger.log({
      source: "backup",
      action: "backup.queued",
      actor: userId || "system",
      level: "INFO",
      entity: "Backup",
      entityId: String(backupId),
    });
  });

  eventBus.on("backup.started", ({ backupId, userId }) => {
    auditLogger.log({
      source: "backup",
      action: "backup.started",
      actor: userId || "system",
      level: "INFO",
      entity: "Backup",
      entityId: String(backupId),
    });
  });

  eventBus.on("backup.success", ({ backupId, provider }) => {
    auditLogger.log({
      source: "backup",
      action: "backup.success",
      actor: "backup-worker",
      level: "INFO",
      entity: "Backup",
      entityId: String(backupId),
      meta: { provider },
    });
  });

  eventBus.on("backup.failed", ({ backupId, error }) => {
    auditLogger.log({
      source: "backup",
      action: "backup.failed",
      actor: "backup-worker",
      level: "ERROR",
      entity: "Backup",
      entityId: String(backupId),
      meta: { error },
    });
  });

  console.log("[Backup] Audit hooks registered");
};

console.log("[Backup] Built-in providers registered.");
