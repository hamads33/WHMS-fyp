const express = require("express");
const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authGuard = require("../../auth/middlewares/auth.guard");
const adminGuard = require("../../auth/middlewares/admin.guard");

const { runBackup } = require("../backup.manager");
const storageConfigService = require("../storageConfig.service");
const {
  listProviders,
  getProviderInfo,
  createProviderInstance,
} = require("../provider/registry");

const eventBus = require("../eventBus");

/* =======================
   VALIDATION
======================= */
const { validate } = require("../validate");
const {
  CreateBackupInputSchema,
  RestoreBackupInputSchema,
} = require("../../../schemas/backup");

/* --------------------------------------------------------------------------
   PROVIDER METADATA
   GET /api/backup/providers
--------------------------------------------------------------------------- */
router.get("/providers", authGuard, (req, res) => {
  const providers = listProviders().map((p) => ({
    id: p.id,
    label: p.label,
    schema: p.schema,
  }));

  return res.json({ success: true, data: providers });
});

/* --------------------------------------------------------------------------
   TEST STORAGE CONFIG
   POST /api/backup/test-storage
--------------------------------------------------------------------------- */
router.post("/test-storage", authGuard, async (req, res) => {
  try {
    const { providerId, config } = req.body;

    const info = getProviderInfo(providerId);
    if (!info) {
      return res.status(400).json({
        success: false,
        error: "Unknown provider",
      });
    }

    const ProviderClass = info.ProviderClass;
    const inst = new ProviderClass(config);
    await inst.test();

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/* --------------------------------------------------------------------------
   CREATE BACKUP
   POST /api/backup
--------------------------------------------------------------------------- */
router.post(
  "/",
  authGuard,
  validate(CreateBackupInputSchema),
  async (req, res) => {
    try {
      const rec = await runBackup({
        userId: req.user.id,
        ...req.body,
      });

      return res.status(201).json({
        success: true,
        data: rec,
      });
    } catch (err) {
      console.error("Backup create error:", err);
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

/* --------------------------------------------------------------------------
   LIST BACKUPS
   - Admins see all
   - Users see their own
--------------------------------------------------------------------------- */
router.get("/", authGuard, async (req, res) => {
  const isAdmin = req.user.roles.some((r) =>
    ["superadmin", "admin", "staff"].includes(r)
  );

  const where = isAdmin ? {} : { createdById: req.user.id };

  const backups = await prisma.backup.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    success: true,
    data: backups,
  });
});

/* --------------------------------------------------------------------------
   GET BACKUP DETAIL
--------------------------------------------------------------------------- */
router.get("/:id", authGuard, async (req, res) => {
  const b = await prisma.backup.findUnique({
    where: { id: req.params.id },
  });

  if (!b) {
    return res.status(404).json({
      success: false,
      error: "Not found",
    });
  }

  const isAdmin = req.user.roles.some((r) =>
    ["superadmin", "admin", "staff"].includes(r)
  );

  if (!isAdmin && b.createdById !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
    });
  }

  return res.json({
    success: true,
    data: b,
  });
});

/* --------------------------------------------------------------------------
   DOWNLOAD BACKUP
--------------------------------------------------------------------------- */
router.get("/:id/download", authGuard, async (req, res) => {
  try {
    const b = await prisma.backup.findUnique({
      where: { id: req.params.id },
    });

    if (!b) {
      return res.status(404).json({
        success: false,
        error: "Not found",
      });
    }

    const isAdmin = req.user.roles.some((r) =>
      ["superadmin", "admin", "staff"].includes(r)
    );

    if (!isAdmin && b.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    if (!b.filePath) {
      return res.status(400).json({
        success: false,
        error: "No file available",
      });
    }

    let providerInstance;

    if (b.storageConfigId) {
      const conf =
        await storageConfigService.decryptAndReturnConfig(b.storageConfigId);
      providerInstance = createProviderInstance(conf.provider, conf);
    } else {
      providerInstance = createProviderInstance("local", {
        localPath: null,
      });
    }

    res.setHeader("Content-Type", "application/gzip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${(b.name || "backup")
        .replace(/\s+/g, "_")
        .trim()}.tar.gz"`
    );

    await providerInstance.downloadToStream(b.filePath, res);
  } catch (err) {
    console.error("download error:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
});

/* --------------------------------------------------------------------------
   RESTORE BACKUP (ADMIN ONLY)
--------------------------------------------------------------------------- */
router.post(
  "/:id/restore",
  authGuard,
  adminGuard({ requiredModule: "backup" }),
  validate(RestoreBackupInputSchema),
  async (req, res) => {
    try {
      const b = await prisma.backup.findUnique({
        where: { id: req.params.id },
      });

      if (!b) {
        return res.status(404).json({
          success: false,
          error: "Not found",
        });
      }

      if (!b.filePath) {
        return res.status(400).json({
          success: false,
          error: "No backup file to restore",
        });
      }

      const restoreQueue = require("../worker/restoreQueue");

      const jobId = await restoreQueue.enqueueRestoreJob(b.id, {
        ...req.body,
        initiatedBy: req.user.id,
      });

      await prisma.backupStepLog.create({
        data: {
          backupId: b.id,
          step: "restore_requested",
          status: "started",
          meta: {
            initiatedBy: req.user.id,
            jobId,
          },
        },
      });

      return res.json({
        success: true,
        message: "Restore scheduled",
        jobId,
      });
    } catch (err) {
      console.error("restore error:", err);
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

module.exports = router;
