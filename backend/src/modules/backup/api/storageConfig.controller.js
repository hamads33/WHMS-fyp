// src/modules/backup/api/storageConfig.controller.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const storageConfigService = require("../storageConfig.service");
const { getProviderInfo, listProviders, createProviderInstance } = require("../provider/registry");
const eventBus = require("../eventBus");

/* ---------------------------
   Auth placeholders (replace)
   --------------------------- */
function ensureAuthed(req, res, next) {
  if (!req.user) return res.status(401).json({ success:false, error: "Unauthorized" });
  return next();
}

/* ---------------------------
   Helpers
   --------------------------- */
function maskConfig(obj) {
  if (!obj || typeof obj !== "object") return {};
  const masked = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    // mask commonly secret-like fields
    const keyLower = String(k).toLowerCase();
    if (keyLower.includes("secret") || keyLower.includes("password") || keyLower.includes("key") || keyLower.includes("token") || keyLower.includes("private")) {
      masked[k] = typeof v === "string" && v.length > 0 ? "••••••••" : "";
    } else {
      // non-secret reveal
      masked[k] = v;
    }
  }
  return masked;
}

/* ---------------------------
   LIST AVAILABLE PROVIDERS (for frontend)
   GET /api/storage-config/providers
   --------------------------- */
router.get("/providers", ensureAuthed, (req, res) => {
  const providers = listProviders().map(p => ({ id: p.id, label: p.label, schema: p.schema }));
  return res.json({ success: true, data: providers });
});

/* ---------------------------
   CREATE STORAGE CONFIG
   POST /api/storage-config
   body: { name, provider, config }
   --------------------------- */
router.post("/", ensureAuthed, async (req, res) => {
  try {
    const { name, provider, config } = req.body;
    if (!name || !provider || !config) return res.status(400).json({ success:false, error: "name, provider and config required" });

    const info = getProviderInfo(provider);
    if (!info) return res.status(400).json({ success:false, error: "Unknown provider" });

    // optional: validate config against schema here (light validation)
    // test connection before saving
    try {
      const ProviderClass = info.ProviderClass;
      const inst = new ProviderClass(config);
      await inst.test();
    } catch (err) {
      return res.status(400).json({ success:false, error: "Test connection failed: " + err.message });
    }

    const created = await storageConfigService.createStorageConfig({
      name,
      provider,
      config,
      createdById: req.user.id
    });

    // emit event
    eventBus.emit("storageConfig.created", { id: created.id, userId: req.user.id, provider });

    // return masked result
    const decrypted = await storageConfigService.decryptAndReturnConfig(created.id).catch(()=>null);
    const masked = maskConfig(decrypted || {});

    return res.status(201).json({
      success: true,
      data: {
        id: created.id,
        name: created.name,
        provider: created.provider,
        createdAt: created.createdAt,
        masked
      }
    });
  } catch (err) {
    console.error("create storage config error:", err);
    return res.status(500).json({ success:false, error: err.message });
  }
});

/* ---------------------------
   LIST USER STORAGE CONFIGS
   GET /api/storage-config
   --------------------------- */
router.get("/", ensureAuthed, async (req, res) => {
  try {
    const rows = await prisma.storageConfig.findMany({
      where: { createdById: String(req.user.id) },
      orderBy: { createdAt: "desc" }
    });

    // decrypt and mask each (non-blocking pattern but fine here)
    const out = await Promise.all(rows.map(async r => {
      const dec = await storageConfigService.decryptAndReturnConfig(r.id).catch(()=>null);
      return {
        id: r.id,
        name: r.name,
        provider: r.provider,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        masked: maskConfig(dec)
      };
    }));

    return res.json({ success: true, data: out });
  } catch (err) {
    console.error("list storage configs error:", err);
    return res.status(500).json({ success:false, error: err.message });
  }
});

/* ---------------------------
   GET ONE STORAGE CONFIG (masked)
   GET /api/storage-config/:id
   --------------------------- */
router.get("/:id", ensureAuthed, async (req, res) => {
  try {
    const id = req.params.id;
    const rec = await storageConfigService.getStorageConfig(Number(id));
    if (!rec) return res.status(404).json({ success:false, error: "Not found" });
    if (String(rec.createdById) !== String(req.user.id) && !req.user.isAdmin) return res.status(403).json({ success:false, error: "Forbidden" });

    const dec = await storageConfigService.decryptAndReturnConfig(rec.id).catch(()=>null);
    const masked = maskConfig(dec);

    return res.json({
      success: true,
      data: {
        id: rec.id,
        name: rec.name,
        provider: rec.provider,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
        masked
      }
    });
  } catch (err) {
    console.error("get storage config error:", err);
    return res.status(500).json({ success:false, error: err.message });
  }
});

/* ---------------------------
   UPDATE (rotate) STORAGE CONFIG
   PATCH /api/storage-config/:id
   body: { name?, config? }
   --------------------------- */
router.patch("/:id", ensureAuthed, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const rec = await storageConfigService.getStorageConfig(id);
    if (!rec) return res.status(404).json({ success:false, error: "Not found" });
    if (String(rec.createdById) !== String(req.user.id) && !req.user.isAdmin) return res.status(403).json({ success:false, error: "Forbidden" });

    // if config is provided, test it
    if (payload.config) {
      const info = getProviderInfo(rec.provider);
      if (!info) return res.status(400).json({ success:false, error: "Unknown provider" });
      try {
        const ProviderClass = info.ProviderClass;
        const inst = new ProviderClass(payload.config);
        await inst.test();
      } catch (err) {
        return res.status(400).json({ success:false, error: "Test connection failed: " + err.message });
      }
    }

    const updated = await storageConfigService.updateStorageConfig(id, {
      provider: rec.provider,
      config: payload.config || storageConfigService.decryptAndReturnConfig(rec.id).catch(()=>null)
    });

    // return masked
    const dec = await storageConfigService.decryptAndReturnConfig(updated.id).catch(()=>null);
    return res.json({ success: true, data: { id: updated.id, name: updated.name, provider: updated.provider, masked: maskConfig(dec) }});
  } catch (err) {
    console.error("update storage config error:", err);
    return res.status(500).json({ success:false, error: err.message });
  }
});

/* ---------------------------
   DELETE STORAGE CONFIG
   DELETE /api/storage-config/:id
   --------------------------- */
router.delete("/:id", ensureAuthed, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rec = await storageConfigService.getStorageConfig(id);
    if (!rec) return res.status(404).json({ success:false, error: "Not found" });
    if (String(rec.createdById) !== String(req.user.id) && !req.user.isAdmin) return res.status(403).json({ success:false, error: "Forbidden" });

    await prisma.storageConfig.delete({ where: { id } });
    eventBus.emit("storageConfig.deleted", { id, userId: req.user.id, provider: rec.provider });
    return res.json({ success: true });
  } catch (err) {
    console.error("delete storage config error:", err);
    return res.status(500).json({ success:false, error: err.message });
  }
});

/* ---------------------------
   TEST AD-HOC STORAGE CONFIG (do not save)
   POST /api/storage-config/test
   body: { provider, config }
   --------------------------- */
router.post("/test", ensureAuthed, async (req, res) => {
  try {
    const { provider, config } = req.body;
    if (!provider || !config) return res.status(400).json({ success:false, error: "provider and config required" });

    const info = getProviderInfo(provider);
    if (!info) return res.status(400).json({ success:false, error: "Unknown provider" });

    const ProviderClass = info.ProviderClass;
    const inst = new ProviderClass(config);

    await inst.test();

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success:false, error: err.message });
  }
});

module.exports = router;
