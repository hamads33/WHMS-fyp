// src/modules/backup/controllers/backup.stats.controller.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authGuard = require("../../auth/middlewares/auth.guard");

/* --------------------------------------------------------------------------
   HELPERS
--------------------------------------------------------------------------- */
function getRoles(user) {
  return Array.isArray(user?.roles) ? user.roles : [];
}

function isAdmin(user) {
  return getRoles(user).some((r) =>
    ["superadmin", "admin", "staff"].includes(r)
  );
}

/* --------------------------------------------------------------------------
   DASHBOARD STATISTICS
   GET /api/backups/stats
--------------------------------------------------------------------------- */
router.get("/", authGuard, async (req, res) => {
  try {
    const admin = isAdmin(req.user);
    const where = admin ? {} : { createdById: req.user.id };

    /* ------------------ Fetch backups ------------------ */
    const allBackups = await prisma.backup.findMany({ where });

    /* ------------------ Status counts ------------------ */
    const totalBackups = allBackups.length;
    const successfulBackups = allBackups.filter(
      (b) => b.status === "success"
    ).length;
    const failedBackups = allBackups.filter(
      (b) => b.status === "failed"
    ).length;
    const runningBackups = allBackups.filter(
      (b) => b.status === "running"
    ).length;
    const queuedBackups = allBackups.filter(
      (b) => b.status === "queued"
    ).length;

    /* ------------------ Storage usage (FIX: Handle BigInt) ------------------ */
    const totalStorageUsedBytes = allBackups.reduce(
      (sum, b) => sum + BigInt(b.sizeBytes || 0),
      0n
    );

    /* ------------------ Average backup size (FIX: Handle BigInt) ------------------ */
    const backupsWithSize = allBackups.filter((b) => b.sizeBytes > 0);
    const averageBackupSizeBytes =
      backupsWithSize.length > 0
        ? Math.floor(
            Number(
              backupsWithSize.reduce((sum, b) => sum + BigInt(b.sizeBytes), 0n) /
                BigInt(backupsWithSize.length)
            )
          )
        : 0;

    /* ------------------ Time-based metrics ------------------ */
    const sortedBackups = [...allBackups].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const lastBackupAt = sortedBackups[0]?.createdAt || null;

    const successfulSorted = allBackups
      .filter((b) => b.status === "success")
      .sort(
        (a, b) =>
          new Date(b.finishedAt || b.createdAt) -
          new Date(a.finishedAt || a.createdAt)
      );

    const lastSuccessfulBackupAt =
      successfulSorted[0]?.finishedAt ||
      successfulSorted[0]?.createdAt ||
      null;

    const oldestSorted = [...allBackups].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const oldestBackupAt = oldestSorted[0]?.createdAt || null;

    /* ------------------ Period counts ------------------ */
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const backupsToday = allBackups.filter(
      (b) => new Date(b.createdAt) >= todayStart
    ).length;

    const backupsThisWeek = allBackups.filter(
      (b) => new Date(b.createdAt) >= weekStart
    ).length;

    const backupsThisMonth = allBackups.filter(
      (b) => new Date(b.createdAt) >= monthStart
    ).length;

    /* ------------------ Storage provider breakdown ------------------ */
    const storageProviderBreakdown = {};
    let storageConfigs = [];

    try {
      storageConfigs = await prisma.storageConfig.findMany({
        select: { id: true, provider: true },
      });
    } catch {
      // Table not ready / optional module
      storageConfigs = [];
    }

    const configMap = new Map(
      storageConfigs.map((c) => [c.id, c.provider])
    );

    allBackups.forEach((b) => {
      const provider = b.storageConfigId
        ? configMap.get(b.storageConfigId) || "unknown"
        : "local";

      storageProviderBreakdown[provider] =
        (storageProviderBreakdown[provider] || 0) + 1;
    });

    /* ------------------ Success rate ------------------ */
    const successRate =
      totalBackups > 0
        ? Math.round((successfulBackups / totalBackups) * 100)
        : 0;

    return res.json({
      success: true,
      data: {
        totalBackups,
        successfulBackups,
        failedBackups,
        runningBackups,
        queuedBackups,
        successRate,
        totalStorageUsedBytes: Number(totalStorageUsedBytes),
        totalStorageUsedGB: Number(
          (Number(totalStorageUsedBytes) / (1024 ** 3)).toFixed(2)
        ),
        averageBackupSizeBytes,
        averageBackupSizeMB: Number(
          (averageBackupSizeBytes / (1024 ** 2)).toFixed(2)
        ),
        lastBackupAt,
        lastSuccessfulBackupAt,
        oldestBackupAt,
        backupsToday,
        backupsThisWeek,
        backupsThisMonth,
        storageProviderBreakdown,
      },
    });
  } catch (err) {
    console.error("Stats error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* --------------------------------------------------------------------------
   SYSTEM HEALTH CHECK
   GET /api/backups/stats/health
--------------------------------------------------------------------------- */
router.get("/health", authGuard, async (_req, res) => {
  try {
    let databaseConnected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {}

    let queueHealth = "unavailable";
    let pendingJobs = 0;
    let activeJobs = 0;
    let failedJobs = 0;

    try {
      const { backupQueue } = require("../worker/queue");
      const [pending, active, failed] = await Promise.all([
        backupQueue.getWaitingCount(),
        backupQueue.getActiveCount(),
        backupQueue.getFailedCount(),
      ]);
      pendingJobs = pending;
      activeJobs = active;
      failedJobs = failed;
      queueHealth = failedJobs > 10 ? "degraded" : "healthy";
    } catch {}

    let storageAvailable = true;
    try {
      const fs = require("fs-extra");
      const path = require("path");
      const testPath = path.join(process.cwd(), "storage", "backups");
      await fs.ensureDir(testPath);
      const testFile = path.join(testPath, `.health-${Date.now()}.tmp`);
      await fs.writeFile(testFile, "ok");
      await fs.remove(testFile);
    } catch {
      storageAvailable = false;
    }

    const runningBackups = await prisma.backup.count({
      where: { status: "running" },
    });

    return res.json({
      success: true,
      data: {
        status: databaseConnected && storageAvailable ? "healthy" : "degraded",
        checks: {
          database: { status: databaseConnected ? "up" : "down" },
          storage: { status: storageAvailable ? "up" : "down" },
          queue: {
            status: queueHealth,
            pendingJobs,
            activeJobs,
            failedJobs,
          },
        },
        metrics: { runningBackups },
      },
    });
  } catch (err) {
    console.error("Health check error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;