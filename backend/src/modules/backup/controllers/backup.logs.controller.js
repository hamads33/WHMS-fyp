// src/modules/backup/controllers/backup.logs.controller.js
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
   GET BACKUP LOGS / STEPS
   GET /api/backups/:id/logs
--------------------------------------------------------------------------- */
router.get("/", authGuard, async (req, res) => {
  try {
    const rawId = req.params.id;

    // Handle test / empty-id cases safely
    if (!rawId || rawId === "null" || rawId === "undefined") {
      return res.json({
        success: true,
        data: [],
      });
    }

    const backupId = Number(rawId);
    if (!Number.isInteger(backupId)) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Check if backup exists
    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Authorization check
    if (!isAdmin(req.user) && backup.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    // Fetch step logs
    const logs = await prisma.backupStepLog.findMany({
      where: { backupId },
      orderBy: { createdAt: "asc" },
    });

    return res.json({
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        step: log.step,
        status: log.status,
        message: log.message,
        meta: log.meta,
        createdAt: log.createdAt,
      })),
    });
  } catch (err) {
    console.error("Logs fetch error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* --------------------------------------------------------------------------
   GET BACKUP STATUS (REAL-TIME PROGRESS)
   GET /api/backups/:id/logs/status
--------------------------------------------------------------------------- */
router.get("/status", authGuard, async (req, res) => {
  try {
    const rawId = req.params.id;

    // Handle test / empty-id cases safely
    if (!rawId || rawId === "null" || rawId === "undefined") {
      return res.json({
        success: true,
        data: {
          status: "unknown",
          progress: 0,
          currentStep: null,
        },
      });
    }

    const backupId = Number(rawId);
    if (!Number.isInteger(backupId)) {
      return res.json({
        success: true,
        data: {
          status: "unknown",
          progress: 0,
          currentStep: null,
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
          status: "unknown",
          progress: 0,
          currentStep: null,
        },
      });
    }

    // Authorization check
    if (!isAdmin(req.user) && backup.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    // Get latest step
    const latestStep = await prisma.backupStepLog.findFirst({
      where: { backupId },
      orderBy: { createdAt: "desc" },
    });

    let progress = 0;
    let currentStep = latestStep?.step || "queued";
    let estimatedTimeRemaining = null;

    if (backup.status === "queued") {
      progress = 0;
      currentStep = "queued";
    } else if (backup.status === "running") {
      const stepProgress = {
        job_started: 5,
        provider_ready: 10,
        db_dump_started: 20,
        db_dump_finished: 50,
        archive_ready: 70,
        upload_started: 75,
        upload_finished: 95,
      };

      progress = stepProgress[currentStep] ?? 50;

      if (backup.startedAt && progress > 0) {
        const elapsed = Date.now() - new Date(backup.startedAt).getTime();
        const estimatedTotal = (elapsed / progress) * 100;
        estimatedTimeRemaining = Math.max(
          0,
          Math.floor((estimatedTotal - elapsed) / 1000)
        );
      }
    } else if (backup.status === "success") {
      progress = 100;
      currentStep = "completed";
    } else if (backup.status === "failed") {
      progress = 100;
      currentStep = "failed";
    }

    return res.json({
      success: true,
      data: {
        id: backup.id,
        status: backup.status,
        progress,
        currentStep,
        startedAt: backup.startedAt,
        finishedAt: backup.finishedAt,
        estimatedTimeRemaining,
        errorMessage: backup.errorMessage,
      },
    });
  } catch (err) {
    console.error("Status fetch error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
