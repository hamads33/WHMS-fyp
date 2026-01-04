// src/modules/backup/controllers/backup.analytics.controller.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authGuard = require("../../auth/middlewares/auth.guard");

/* --------------------------------------------------------------------------
   HELPERS (DO NOT CHANGE LOGIC, ONLY SAFETY)
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
   TIMELINE DATA (for charts)
   GET /api/backups/analytics/timeline?period=7d
--------------------------------------------------------------------------- */
router.get("/timeline", authGuard, async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    const admin = isAdmin(req.user);
    const where = admin ? {} : { createdById: req.user.id };

    const now = new Date();
    let startDate;
    let groupByFormat;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 86400000);
        groupByFormat = "day";
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 86400000);
        groupByFormat = "day";
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 86400000);
        groupByFormat = "week";
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 86400000);
        groupByFormat = "month";
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 86400000);
        groupByFormat = "day";
    }

    const backups = await prisma.backup.findMany({
      where: {
        ...where,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "asc" },
    });

    const timelineData = {};

    backups.forEach((backup) => {
      const date = new Date(backup.createdAt);
      let key;

      if (groupByFormat === "day") {
        key = date.toISOString().split("T")[0];
      } else if (groupByFormat === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
      }

      if (!timelineData[key]) {
        timelineData[key] = {
          date: key,
          total: 0,
          successful: 0,
          failed: 0,
          running: 0,
          storageUsedBytes: 0n,
        };
      }

      timelineData[key].total++;
      if (backup.status === "success") timelineData[key].successful++;
      if (backup.status === "failed") timelineData[key].failed++;
      if (backup.status === "running") timelineData[key].running++;
      // FIX: Convert to BigInt and add as BigInt
      timelineData[key].storageUsedBytes += BigInt(backup.sizeBytes || 0);
    });

    const result = Object.values(timelineData).map((item) => ({
      ...item,
      storageUsedBytes: Number(item.storageUsedBytes),
      storageUsedMB: Number(
        (Number(item.storageUsedBytes) / (1024 ** 2)).toFixed(2)
      ),
    }));

    return res.json({
      success: true,
      data: {
        period,
        groupBy: groupByFormat,
        timeline: result,
      },
    });
  } catch (err) {
    console.error("Timeline error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* --------------------------------------------------------------------------
   STORAGE USAGE OVER TIME
   GET /api/backups/analytics/storage-usage
--------------------------------------------------------------------------- */
router.get("/storage-usage", authGuard, async (req, res) => {
  try {
    const admin = isAdmin(req.user);
    const where = admin ? {} : { createdById: req.user.id };

    const backups = await prisma.backup.findMany({
      where: {
        ...where,
        status: "success",
        sizeBytes: { not: null },
      },
      orderBy: { finishedAt: "asc" },
      select: {
        id: true,
        name: true,
        sizeBytes: true,
        finishedAt: true,
      },
    });

    let cumulative = 0n;
    const storageGrowth = backups.map((backup) => {
      cumulative += BigInt(backup.sizeBytes);
      return {
        date: backup.finishedAt,
        backupName: backup.name,
        sizeBytes: Number(backup.sizeBytes),
        sizeMB: Number((Number(backup.sizeBytes) / (1024 ** 2)).toFixed(2)),
        cumulativeBytes: Number(cumulative),
        cumulativeGB: Number((Number(cumulative) / (1024 ** 3)).toFixed(2)),
      };
    });

    return res.json({
      success: true,
      data: storageGrowth,
    });
  } catch (err) {
    console.error("Storage usage error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* --------------------------------------------------------------------------
   SUCCESS RATE OVER TIME
   GET /api/backups/analytics/success-rate
--------------------------------------------------------------------------- */
router.get("/success-rate", authGuard, async (req, res) => {
  try {
    const admin = isAdmin(req.user);
    const where = admin ? {} : { createdById: req.user.id };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const backups = await prisma.backup.findMany({
      where: {
        ...where,
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ["success", "failed"] },
      },
      orderBy: { createdAt: "asc" },
    });

    const dailyStats = {};

    backups.forEach((backup) => {
      const date = backup.createdAt.toISOString().split("T")[0];

      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          total: 0,
          successful: 0,
          failed: 0,
        };
      }

      dailyStats[date].total++;
      if (backup.status === "success") dailyStats[date].successful++;
      if (backup.status === "failed") dailyStats[date].failed++;
    });

    const result = Object.values(dailyStats).map((day) => ({
      ...day,
      successRate:
        day.total > 0
          ? Math.round((day.successful / day.total) * 100)
          : 0,
    }));

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Success rate error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* --------------------------------------------------------------------------
   BACKUP TYPE DISTRIBUTION
   GET /api/backups/analytics/type-distribution
--------------------------------------------------------------------------- */
router.get("/type-distribution", authGuard, async (req, res) => {
  try {
    const admin = isAdmin(req.user);
    const where = admin ? {} : { createdById: req.user.id };

    const backups = await prisma.backup.findMany({
      where,
      select: { type: true, status: true, sizeBytes: true },
    });

    const distribution = {};

    backups.forEach((backup) => {
      const type = backup.type || "unknown";

      if (!distribution[type]) {
        distribution[type] = {
          type,
          count: 0,
          successful: 0,
          failed: 0,
          totalSizeBytes: 0n,
        };
      }

      distribution[type].count++;
      if (backup.status === "success") distribution[type].successful++;
      if (backup.status === "failed") distribution[type].failed++;
      // FIX: Convert to BigInt and add as BigInt
      distribution[type].totalSizeBytes += BigInt(backup.sizeBytes || 0);
    });

    const result = Object.values(distribution).map((item) => ({
      ...item,
      totalSizeBytes: Number(item.totalSizeBytes),
      totalSizeGB: Number(
        (Number(item.totalSizeBytes) / (1024 ** 3)).toFixed(2)
      ),
      successRate:
        item.count > 0
          ? Math.round((item.successful / item.count) * 100)
          : 0,
    }));

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Type distribution error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;