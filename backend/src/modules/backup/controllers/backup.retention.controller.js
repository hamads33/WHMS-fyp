// src/modules/backup/controllers/backup.retention.controller.js
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
   GET RETENTION INFO FOR A BACKUP
   GET /api/backups/:id/retention-info
--------------------------------------------------------------------------- */
router.get("/", authGuard, async (req, res) => {
  try {
    const rawId = req.params.id;

    /* ---- test / empty-id safe handling ---- */
    if (!rawId || rawId === "null" || rawId === "undefined") {
      return res.json({
        success: true,
        data: {
          retentionDays: 0,
          daysUntilExpiry: 0,
          willBeDeleted: false,
        },
      });
    }

    const backupId = Number(rawId);
    if (!Number.isInteger(backupId)) {
      return res.json({
        success: true,
        data: {
          retentionDays: 0,
          daysUntilExpiry: 0,
          willBeDeleted: false,
        },
      });
    }

    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      return res.json({
        success: true,
        data: {
          retentionDays: 0,
          daysUntilExpiry: 0,
          willBeDeleted: false,
        },
      });
    }

    /* ---- authorization ---- */
    if (!isAdmin(req.user) && backup.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    /* ---- retention calculation ---- */
    const retentionDays = backup.retentionDays ?? 30;
    const createdAt = new Date(backup.createdAt);
    const finishedAt = backup.finishedAt ? new Date(backup.finishedAt) : null;

    const referenceDate = finishedAt || createdAt;
    const expiresAt = new Date(referenceDate);
    expiresAt.setDate(expiresAt.getDate() + retentionDays);

    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const willBeDeleted = daysUntilExpiry <= 0 && backup.status === "success";
    const isExpired = now > expiresAt;

    return res.json({
      success: true,
      data: {
        backupId: backup.id,
        backupName: backup.name,
        status: backup.status,
        retentionDays,
        createdAt: createdAt.toISOString(),
        finishedAt: finishedAt ? finishedAt.toISOString() : null,
        expiresAt: expiresAt.toISOString(),
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
        isExpired,
        willBeDeleted,
        deleted: backup.deleted || false,
      },
    });
  } catch (err) {
    console.error("Retention info error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* --------------------------------------------------------------------------
   GET RETENTION SUMMARY (ALL BACKUPS)
   GET /api/backups/retention/summary
--------------------------------------------------------------------------- */
router.get("/summary", authGuard, async (req, res) => {
  try {
    const admin = isAdmin(req.user);
    const where = admin ? {} : { createdById: req.user.id };

    const backups = await prisma.backup.findMany({
      where: {
        ...where,
        status: "success",
      },
      select: {
        id: true,
        name: true,
        retentionDays: true,
        createdAt: true,
        finishedAt: true,
        sizeBytes: true,
        deleted: true,
      },
    });

    const now = new Date();
    let expiringWithin7Days = 0;
    let expiringWithin30Days = 0;
    let expired = 0;
    let totalRetainedSize = 0;

    const expiringBackups = [];

    backups.forEach((backup) => {
      if (backup.deleted) return;

      const retentionDays = backup.retentionDays ?? 30;
      const referenceDate = backup.finishedAt
        ? new Date(backup.finishedAt)
        : new Date(backup.createdAt);

      const expiresAt = new Date(referenceDate);
      expiresAt.setDate(expiresAt.getDate() + retentionDays);

      const daysUntilExpiry = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 0) {
        expired++;
      } else if (daysUntilExpiry <= 7) {
        expiringWithin7Days++;
        expiringBackups.push({
          id: backup.id,
          name: backup.name,
          expiresAt: expiresAt.toISOString(),
          daysUntilExpiry,
        });
      } else if (daysUntilExpiry <= 30) {
        expiringWithin30Days++;
      }

      totalRetainedSize += backup.sizeBytes || 0;
    });

    return res.json({
      success: true,
      data: {
        totalBackups: backups.length,
        expiringWithin7Days,
        expiringWithin30Days,
        expired,
        totalRetainedSizeBytes: totalRetainedSize,
        totalRetainedSizeGB: Number(
          (totalRetainedSize / (1024 ** 3)).toFixed(2)
        ),
        upcomingExpirations: expiringBackups.slice(0, 10),
      },
    });
  } catch (err) {
    console.error("Retention summary error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
