// src/modules/backup/controllers/backup.bulk.controller.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authGuard = require("../../auth/middlewares/auth.guard");
const adminGuard = require("../../auth/middlewares/admin.guard");
const { createProviderInstance } = require("../provider/registry");
const storageConfigService = require("../storageConfig.service");
const eventBus = require("../eventBus");

/* --------------------------------------------------------------------------
   HELPERS
--------------------------------------------------------------------------- */
function getRoles(user) {
  return Array.isArray(user?.roles) ? user.roles : [];
}

function isAdmin(user) {
  return getRoles(user).some(r =>
    ["superadmin", "admin", "staff"].includes(r)
  );
}

/* --------------------------------------------------------------------------
   BULK DELETE BACKUPS
   POST /api/backups/bulk-delete
--------------------------------------------------------------------------- */
router.post("/", authGuard, async (req, res) => {
  try {
    const { backupIds } = req.body;

    if (!Array.isArray(backupIds) || backupIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "backupIds must be a non-empty array",
      });
    }

    const backups = await prisma.backup.findMany({
      where: { id: { in: backupIds } },
    });

    // 👉 Important: do NOT throw
    if (backups.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No backups found",
      });
    }

    const admin = isAdmin(req.user);

    const forbidden = backups.filter(
      b => !admin && b.createdById !== req.user.id
    );

    if (forbidden.length > 0) {
      return res.status(403).json({
        success: false,
        error: "Access denied to some backups",
        forbiddenIds: forbidden.map(b => b.id),
      });
    }

    const results = { success: [], failed: [] };

    for (const backup of backups) {
      try {
        /* ---- delete storage file ---- */
        if (backup.filePath) {
          let provider = null;

          if (backup.storageConfigId) {
            const conf =
              await storageConfigService.decryptAndReturnConfig(
                backup.storageConfigId
              );
            if (conf) {
              provider = createProviderInstance(conf.provider, conf);
            }
          } else {
            provider = createProviderInstance("local", {});
          }

          if (provider) {
            try {
              await provider.delete(backup.filePath);
            } catch (e) {
              // log only, do not fail delete
              console.error("Storage delete failed:", e.message);
            }
          }
        }

        /* ---- FK SAFE DELETE ORDER ---- */
        await prisma.backupStepLog.deleteMany({
          where: { backupId: backup.id },
        });

        await prisma.backup.delete({
          where: { id: backup.id },
        });

        eventBus.emit("backup.deleted", {
          backupId: backup.id,
          userId: req.user.id,
        });

        results.success.push(backup.id);
      } catch (err) {
        results.failed.push({
          id: backup.id,
          error: err.message,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        deleted: results.success.length,
        failed: results.failed.length,
        details: results,
      },
    });
  } catch (err) {
    console.error("Bulk delete error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* --------------------------------------------------------------------------
   BULK RESTORE (ADMIN ONLY)
--------------------------------------------------------------------------- */
router.post(
  "/restore",
  authGuard,
  adminGuard({ requiredModule: "backup" }),
  async (req, res) => {
    try {
      const { backupIds, destination } = req.body;

      if (!Array.isArray(backupIds) || backupIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "backupIds must be a non-empty array",
        });
      }

      const backups = await prisma.backup.findMany({
        where: {
          id: { in: backupIds },
          status: "success",
        },
      });

      if (backups.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No successful backups found",
        });
      }

      const restoreQueue = require("../worker/restoreQueue");
      const results = { queued: [], failed: [] };

      for (const backup of backups) {
        try {
          const jobId = await restoreQueue.enqueueRestoreJob(backup.id, {
            destination: destination || null,
            initiatedBy: req.user.id,
          });

          await prisma.backupStepLog.create({
            data: {
              backupId: backup.id,
              step: "restore_requested",
              status: "started",
              meta: { jobId, initiatedBy: req.user.id },
            },
          });

          results.queued.push({ backupId: backup.id, jobId });
        } catch (err) {
          results.failed.push({ backupId: backup.id, error: err.message });
        }
      }

      return res.json({
        success: true,
        data: results,
      });
    } catch (err) {
      console.error("Bulk restore error:", err);
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

module.exports = router;
