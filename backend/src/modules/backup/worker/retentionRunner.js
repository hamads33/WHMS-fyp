// src/modules/backup/worker/retentionRunner.js
const { Worker } = require("bullmq");
const { connection } = require("./retentionQueue");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const storageConfigService = require("../storageConfig.service");
const { createProviderInstance } = require("../provider/registry");
const eventBus = require("../eventBus");

const worker = new Worker("backup_retention", async (job) => {
  console.log("[retention] running retention job", job.id);
  // Find backups that are success and exceeded retentionDays
  const now = new Date();
  const expired = await prisma.backup.findMany({
    where: {
      status: "success",
      finishedAt: { not: null },
    }
  });

  for (const b of expired) {
    try {
      // skip if retentionDays not set or zero
      const keepDays = b.retentionDays || 0;
      if (keepDays <= 0) continue;
      if (!b.finishedAt) continue;
      const expiration = new Date(b.finishedAt);
      expiration.setDate(expiration.getDate() + keepDays);
      if (expiration > now) continue; // not expired

      // load provider
      let providerInstance;
      if (b.storageConfigId) {
        const conf = await storageConfigService.decryptAndReturnConfig(b.storageConfigId);
        if (!conf) {
          await prisma.backupStepLog.create({ data: { backupId: b.id, step: "retention_error", status: "failed", message: "decrypt failed" } });
          continue;
        }
        providerInstance = createProviderInstance(conf.provider, conf);
      } else {
        providerInstance = createProviderInstance("local", { localPath: null });
      }

      // log start
      await prisma.backupStepLog.create({ data: { backupId: b.id, step: "retention_delete_started", status: "started", meta: { remotePath: b.filePath } } });

      // call provider.delete
      try {
        await providerInstance.delete(b.filePath);
      } catch (e) {
        // mark step failed but continue
        await prisma.backupStepLog.create({ data: { backupId: b.id, step: "retention_delete_failed", status: "failed", message: e.message } });
        eventBus.emit("backup.retention.failed", { backupId: b.id, error: e.message });
        continue;
      }

      // hard delete: remove step logs first (FK safety), then the record
      await prisma.backupStepLog.deleteMany({ where: { backupId: b.id } });
      await prisma.backup.delete({ where: { id: b.id } });

      await prisma.backupStepLog.create({ data: { backupId: b.id, step: "retention_delete_success", status: "success" } });
      eventBus.emit("backup.retention.deleted", { backupId: b.id });

    } catch (err) {
      console.error("[retention] item error", b.id, err);
      // best-effort log
      await prisma.backupStepLog.create({ data: { backupId: b.id, step: "retention_error", status: "failed", message: err.message } });
    }
  }

  return { done: true };
}, { connection, concurrency: Number(process.env.RETENTION_WORKER_CONCURRENCY || 1) });

worker.on("failed", (job, err) => {
  console.error("[retention] job failed", job.id, err?.message || err);
});
worker.on("completed", (job) => {
  console.log("[retention] job completed", job.id);
});

module.exports = worker;
