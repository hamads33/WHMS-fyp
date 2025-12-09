// src/modules/backup/api/backup.controller.js
const express = require("express");
const router = express.Router();

const { runBackup } = require("../backup.manager");
const storageConfigService = require("../storageConfig.service");
const { listProviders, getProviderInfo, createProviderInstance } = require("../provider/registry");

const eventBus = require("../eventBus");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* --------------------------------------------------------------------------
   Auth Middleware (replace with your real RBAC)
--------------------------------------------------------------------------- */
function ensureAuthed(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  return next();
}

function ensureAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ success: false, error: "Admin only" });
  }
  return next();
}

/* --------------------------------------------------------------------------
   PROVIDER METADATA (for frontend dynamic forms)
   GET /api/backup/providers
--------------------------------------------------------------------------- */
router.get("/providers", ensureAuthed, (req, res) => {
  const providers = listProviders().map((p) => ({
    id: p.id,
    label: p.label,
    schema: p.schema
  }));

  return res.json({ success: true, data: providers });
});

/* --------------------------------------------------------------------------
   TEST STORAGE CONFIG
   POST /api/backup/test-storage
--------------------------------------------------------------------------- */
router.post("/test-storage", ensureAuthed, async (req, res) => {
  try {
    const { providerId, config } = req.body;

    const info = getProviderInfo(providerId);
    if (!info) {
      return res.status(400).json({ success: false, error: "Unknown provider" });
    }

    const ProviderClass = info.ProviderClass;
    const inst = new ProviderClass(config);

    await inst.test();

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/* --------------------------------------------------------------------------
   CREATE BACKUP
   POST /api/backup/
--------------------------------------------------------------------------- */
router.post("/", ensureAuthed, async (req, res) => {
  try {
    const payload = req.body;

    const rec = await runBackup({
      userId: req.user.id,
      ...payload
    });

    return res.status(201).json({ success: true, data: rec });
  } catch (err) {
    console.error("Backup create error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* --------------------------------------------------------------------------
   LIST BACKUPS (user-scoped unless admin)
   GET /api/backup/
--------------------------------------------------------------------------- */
router.get("/", ensureAuthed, async (req, res) => {
  const where = req.user.isAdmin
    ? {}
    : { createdById: req.user.id };

  const backups = await prisma.backup.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });

  return res.json({ success: true, data: backups });
});

/* --------------------------------------------------------------------------
   GET BACKUP DETAIL
   GET /api/backup/:id
--------------------------------------------------------------------------- */
router.get("/:id", ensureAuthed, async (req, res) => {
  const b = await prisma.backup.findUnique({ where: { id: req.params.id } });

  if (!b) return res.status(404).json({ success: false, error: "Not found" });

  if (b.createdById !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  return res.json({ success: true, data: b });
});

/* --------------------------------------------------------------------------
   DOWNLOAD BACKUP
   GET /api/backup/:id/download
--------------------------------------------------------------------------- */
router.get("/:id/download", ensureAuthed, async (req, res) => {
  try {
    const id = req.params.id;
    const b = await prisma.backup.findUnique({ where: { id } });

    if (!b) return res.status(404).json({ success: false, error: "Not found" });

    if (b.createdById !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    if (!b.filePath) {
      return res.status(400).json({ success: false, error: "No file available" });
    }

    let providerInstance;

    if (b.storageConfigId) {
      const conf = await storageConfigService.decryptAndReturnConfig(b.storageConfigId);
      providerInstance = createProviderInstance(conf.provider, conf);
    } else {
      providerInstance = createProviderInstance("local", { localPath: null });
    }

    // headers
    res.setHeader("Content-Type", "application/gzip");
    const suggestedName = (b.name || "backup").replace(/\s+/g, "_") + ".tar.gz";
    res.setHeader("Content-Disposition", `attachment; filename="${suggestedName}"`);

    await providerInstance.downloadToStream(b.filePath, res);
    // provider handles ending the stream
  } catch (err) {
    console.error("download error", err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
});

/* --------------------------------------------------------------------------
   ADMIN-ONLY RESTORE BACKUP
   POST /api/backup/:id/restore
--------------------------------------------------------------------------- */
router.post("/:id/restore", ensureAuthed, ensureAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { restoreDb = true, restoreFiles = true, destination } = req.body;

    const b = await prisma.backup.findUnique({ where: { id } });

    if (!b) return res.status(404).json({ success: false, error: "Not found" });
    if (!b.filePath) return res.status(400).json({ success: false, error: "No backup file to restore" });

    // Enqueue restore job (restoreQueue implemented separately)
    const restoreQueue = require("../worker/restoreQueue");
    const jobId = await restoreQueue.enqueueRestoreJob(b.id, {
      restoreDb,
      restoreFiles,
      destination,
      initiatedBy: req.user.id
    });

    await prisma.backupStepLog.create({
      data: {
        backupId: b.id,
        step: "restore_requested",
        status: "started",
        meta: { initiatedBy: req.user.id, jobId }
      }
    });

    return res.json({
      success: true,
      message: "Restore scheduled",
      jobId
    });
  } catch (err) {
    console.error("restore error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
