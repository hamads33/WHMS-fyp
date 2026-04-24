module.exports = function registerBackupAuditLogs({ eventBus, auditLogger }) {
  // Backup queued
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

  // Backup started
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

  // Backup success
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

  // Backup failed
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
};
