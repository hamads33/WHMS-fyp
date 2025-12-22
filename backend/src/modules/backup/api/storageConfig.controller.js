const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const storageConfigService = require("../storageConfig.service");
const { getProviderInfo, listProviders } = require("../provider/registry");
const eventBus = require("../eventBus");

/* =======================
   AUTH (REAL, NOT PLACEHOLDER)
======================= */
const authGuard = require("../../auth/middlewares/auth.guard");
const adminGuard = require("../../auth/middlewares/admin.guard");

/* =======================
   VALIDATION
======================= */
const { validate } = require("../validate");
const {
  CreateStorageConfigInputSchema,
  UpdateStorageConfigInputSchema,
  TestStorageConfigInputSchema,
} = require("../../../schemas/backup");

/* ---------------------------
   Helpers
--------------------------- */
function maskConfig(obj) {
  if (!obj || typeof obj !== "object") return {};
  const masked = {};

  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const keyLower = String(k).toLowerCase();

    if (
      keyLower.includes("secret") ||
      keyLower.includes("password") ||
      keyLower.includes("key") ||
      keyLower.includes("token") ||
      keyLower.includes("private")
    ) {
      masked[k] = typeof v === "string" && v.length > 0 ? "••••••••" : "";
    } else {
      masked[k] = v;
    }
  }

  return masked;
}

/* ---------------------------
   LIST AVAILABLE PROVIDERS
   GET /api/storage-configs/providers
--------------------------- */
router.get("/providers", authGuard, (req, res) => {
  const providers = listProviders().map((p) => ({
    id: p.id,
    label: p.label,
    schema: p.schema,
  }));

  return res.json({ success: true, data: providers });
});

/* ---------------------------
   CREATE STORAGE CONFIG
   POST /api/storage-configs
--------------------------- */
router.post(
  "/",
  authGuard,
  validate(CreateStorageConfigInputSchema),
  async (req, res) => {
    try {
      const { name, provider, config } = req.body;

      const info = getProviderInfo(provider);
      if (!info) {
        return res.status(400).json({ success: false, error: "Unknown provider" });
      }

      try {
        const ProviderClass = info.ProviderClass;
        const inst = new ProviderClass(config);
        await inst.test();
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, error: "Test connection failed: " + err.message });
      }

      const created = await storageConfigService.createStorageConfig({
        name,
        provider,
        config,
        createdById: req.user.id,
      });

      eventBus.emit("storageConfig.created", {
        id: created.id,
        userId: req.user.id,
        provider,
      });

      const decrypted = await storageConfigService
        .decryptAndReturnConfig(created.id)
        .catch(() => null);

      return res.status(201).json({
        success: true,
        data: {
          id: created.id,
          name: created.name,
          provider: created.provider,
          createdAt: created.createdAt,
          masked: maskConfig(decrypted || {}),
        },
      });
    } catch (err) {
      console.error("create storage config error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/* ---------------------------
   LIST USER STORAGE CONFIGS
   GET /api/storage-configs
--------------------------- */
router.get("/", authGuard, async (req, res) => {
  try {
    const rows = await prisma.storageConfig.findMany({
      where: { createdById: String(req.user.id) },
      orderBy: { createdAt: "desc" },
    });

    const out = await Promise.all(
      rows.map(async (r) => {
        const dec = await storageConfigService
          .decryptAndReturnConfig(r.id)
          .catch(() => null);

        return {
          id: r.id,
          name: r.name,
          provider: r.provider,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          masked: maskConfig(dec),
        };
      })
    );

    return res.json({ success: true, data: out });
  } catch (err) {
    console.error("list storage configs error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------
   GET ONE STORAGE CONFIG
   GET /api/storage-configs/:id
--------------------------- */
router.get("/:id", authGuard, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rec = await storageConfigService.getStorageConfig(id);

    if (!rec) {
      return res.status(404).json({ success: false, error: "Not found" });
    }

    if (String(rec.createdById) !== String(req.user.id) && !req.user.roles.includes("admin")) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const dec = await storageConfigService
      .decryptAndReturnConfig(rec.id)
      .catch(() => null);

    return res.json({
      success: true,
      data: {
        id: rec.id,
        name: rec.name,
        provider: rec.provider,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
        masked: maskConfig(dec),
      },
    });
  } catch (err) {
    console.error("get storage config error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------
   UPDATE STORAGE CONFIG
   PATCH /api/storage-configs/:id
--------------------------- */
router.patch(
  "/:id",
  authGuard,
  validate(UpdateStorageConfigInputSchema),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const payload = req.body;

      const rec = await storageConfigService.getStorageConfig(id);
      if (!rec) {
        return res.status(404).json({ success: false, error: "Not found" });
      }

      if (String(rec.createdById) !== String(req.user.id) && !req.user.roles.includes("admin")) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      if (payload.config) {
        const info = getProviderInfo(rec.provider);
        if (!info) {
          return res.status(400).json({ success: false, error: "Unknown provider" });
        }

        try {
          const ProviderClass = info.ProviderClass;
          const inst = new ProviderClass(payload.config);
          await inst.test();
        } catch (err) {
          return res
            .status(400)
            .json({ success: false, error: "Test connection failed: " + err.message });
        }
      }

      const updated = await storageConfigService.updateStorageConfig(id, {
        provider: rec.provider,
        config:
          payload.config ||
          (await storageConfigService.decryptAndReturnConfig(rec.id)),
      });

      const dec = await storageConfigService
        .decryptAndReturnConfig(updated.id)
        .catch(() => null);

      return res.json({
        success: true,
        data: {
          id: updated.id,
          name: updated.name,
          provider: updated.provider,
          masked: maskConfig(dec),
        },
      });
    } catch (err) {
      console.error("update storage config error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/* ---------------------------
   DELETE STORAGE CONFIG
   DELETE /api/storage-configs/:id
--------------------------- */
router.delete("/:id", authGuard, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rec = await storageConfigService.getStorageConfig(id);

    if (!rec) {
      return res.status(404).json({ success: false, error: "Not found" });
    }

    if (String(rec.createdById) !== String(req.user.id) && !req.user.roles.includes("admin")) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    await prisma.storageConfig.delete({ where: { id } });

    eventBus.emit("storageConfig.deleted", {
      id,
      userId: req.user.id,
      provider: rec.provider,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("delete storage config error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------
   TEST AD-HOC STORAGE CONFIG
   POST /api/storage-configs/test
--------------------------- */
router.post(
  "/test",
  authGuard,
  validate(TestStorageConfigInputSchema),
  async (req, res) => {
    try {
      const { provider, config } = req.body;

      const info = getProviderInfo(provider);
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
  }
);

module.exports = router;
