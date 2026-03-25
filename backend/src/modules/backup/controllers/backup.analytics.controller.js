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

/* --------------------------------------------------------------------------
   TIMELINE EVENTS (recent backup activity feed)
   GET /api/backups/analytics/timeline-events?limit=20
--------------------------------------------------------------------------- */
router.get("/timeline-events", authGuard, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const admin = isAdmin(req.user);
    const where = admin ? {} : { createdById: req.user.id };

    const backups = await prisma.backup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        sizeBytes: true,
        createdAt: true,
        finishedAt: true,
        errorMessage: true,
      },
    });

    const events = backups.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type || "full",
      status: b.status,
      sizeBytes: Number(b.sizeBytes || 0),
      sizeMB: Number((Number(b.sizeBytes || 0) / (1024 ** 2)).toFixed(2)),
      createdAt: b.createdAt,
      finishedAt: b.finishedAt,
      duration: b.finishedAt
        ? Math.round((new Date(b.finishedAt) - new Date(b.createdAt)) / 1000)
        : null,
      errorMessage: b.errorMessage || null,
    }));

    return res.json({ success: true, data: { events } });
  } catch (err) {
    console.error("Timeline events error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* --------------------------------------------------------------------------
   SCHEDULE HEATMAP
   GET /api/backups/analytics/schedule-heatmap?weeks=8
--------------------------------------------------------------------------- */
router.get("/schedule-heatmap", authGuard, async (req, res) => {
  try {
    const weeks = Math.min(parseInt(req.query.weeks) || 8, 26);
    const admin = isAdmin(req.user);
    const where = admin ? {} : { createdById: req.user.id };

    const startDate = new Date(Date.now() - weeks * 7 * 86400000);

    const backups = await prisma.backup.findMany({
      where: { ...where, createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
    });

    const dayMap = {};
    backups.forEach((b) => {
      const key = b.createdAt.toISOString().split("T")[0];
      if (!dayMap[key]) {
        dayMap[key] = { date: key, count: 0, successful: 0, failed: 0 };
      }
      dayMap[key].count++;
      if (b.status === "success") dayMap[key].successful++;
      if (b.status === "failed") dayMap[key].failed++;
    });

    return res.json({ success: true, data: Object.values(dayMap) });
  } catch (err) {
    console.error("Schedule heatmap error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* --------------------------------------------------------------------------
   LIFECYCLE STATS
   GET /api/backups/analytics/lifecycle-stats
--------------------------------------------------------------------------- */
router.get("/lifecycle-stats", authGuard, async (req, res) => {
  try {
    const admin = isAdmin(req.user);
    const where = admin ? {} : { createdById: req.user.id };

    const now = new Date();

    const allBackups = await prisma.backup.findMany({
      where,
      select: {
        status: true,
        createdAt: true,
        retentionDays: true,
        finishedAt: true,
      },
    });

    let created = allBackups.length;
    let stored = 0;
    let retained = 0;
    let expiring = 0;
    let deleted = 0;
    let running = 0;
    let failed = 0;

    allBackups.forEach((b) => {
      if (b.status === "running" || b.status === "queued") {
        running++;
        return;
      }
      if (b.status === "failed") {
        failed++;
        return;
      }
      if (b.status === "success") {
        stored++;
        const retention = b.retentionDays || 30;
        const ref = b.finishedAt || b.createdAt;
        const expiresAt = new Date(new Date(ref).getTime() + retention * 86400000);
        const daysLeft = Math.ceil((expiresAt - now) / 86400000);

        if (daysLeft < 0) {
          deleted++;
        } else if (daysLeft <= 7) {
          expiring++;
        } else {
          retained++;
        }
      }
    });

    return res.json({
      success: true,
      data: { created, stored, retained, expiring, deleted, running, failed },
    });
  } catch (err) {
    console.error("Lifecycle stats error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;