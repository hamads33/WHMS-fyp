// src/modules/plugins/routes/plugins.routes.js
// Secure plugin routes with validation and proper error handling

const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const os = require("os");
const AdmZip = require("adm-zip");
const multer = require("multer");

// Validation regex
const PLUGIN_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ACTION_NAME_REGEX = /^[a-zA-Z0-9_:-]+$/;

module.exports = function pluginsRoutes({
  logger = console,
  registry,
  prisma,
  loader,
  app
} = {}) {
  if (!registry) throw new Error("pluginsRoutes requires { registry }");

  const router = express.Router();

  // Paths
  const pluginsDir = path.join(process.cwd(), "plugins", "actions");
  const trashBase = path.join(process.cwd(), "plugins", "_trash");
  const backupsBase = path.join(process.cwd(), "plugins", "_backups");
  const logsDir = path.join(process.cwd(), "logs");
  const eventsLogFile = path.join(logsDir, "plugin-events.log");
  const uploadsTmp = path.join(os.tmpdir(), "plugin-uploads");

  // Ensure directories
  [pluginsDir, trashBase, backupsBase, logsDir, uploadsTmp].forEach(ensureDir);

  const upload = multer({
    dest: uploadsTmp,
    limits: { 
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 1
    },
    fileFilter: (req, file, cb) => {
      if (path.extname(file.originalname).toLowerCase() !== '.zip') {
        return cb(new Error('Only .zip files allowed'));
      }
      cb(null, true);
    }
  });

  // ============================================
  // Validation Middleware
  // ============================================
  function validatePluginId(req, res, next) {
    const pluginId = req.params.pluginId;
    if (!pluginId || !PLUGIN_ID_REGEX.test(pluginId)) {
      return res.status(400).json({ 
        ok: false, 
        error: "invalid_plugin_id",
        details: "Plugin ID must contain only alphanumeric, underscore, or hyphen"
      });
    }
    next();
  }

  function validateActionName(req, res, next) {
    const actionName = req.params.actionName;
    if (!actionName || !ACTION_NAME_REGEX.test(actionName)) {
      return res.status(400).json({ 
        ok: false, 
        error: "invalid_action_name",
        details: "Action name must contain only alphanumeric, underscore, hyphen, or colon"
      });
    }
    next();
  }

  // ============================================
  // Helper Functions
  // ============================================
  function ensureDir(dir) {
    try {
      if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
      }
    } catch (e) {
      logger.warn(`ensureDir failed for ${dir}:`, e.message);
    }
  }

  function logEvent(event) {
    try {
      const line = JSON.stringify({ 
        ts: new Date().toISOString(), 
        ...event 
      });
      fsSync.appendFileSync(eventsLogFile, line + "\n");
    } catch (e) {
      logger.warn("Failed to write event log:", e.message);
    }
  }

  async function copyRecursive(src, dst) {
    await fs.mkdir(dst, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const dstPath = path.join(dst, entry.name);
      
      if (entry.isDirectory()) {
        await copyRecursive(srcPath, dstPath);
      } else {
        await fs.copyFile(srcPath, dstPath);
      }
    }
  }

  async function removeRecursive(targetPath) {
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch (e) {
      logger.warn(`removeRecursive failed for ${targetPath}:`, e.message);
    }
  }

  async function createBackupZip(srcFolder, destZipPath) {
    try {
      await fs.mkdir(path.dirname(destZipPath), { recursive: true });
      const zip = new AdmZip();
      zip.addLocalFolder(srcFolder);
      zip.writeZip(destZipPath);
      return true;
    } catch (e) {
      logger.warn("createBackupZip failed:", e.message);
      return false;
    }
  }

  function isPluginEnabled(pluginId) {
    try {
      const plugin = registry.get(pluginId);
      if (!plugin) return false;
      
      // Check explicit enabled flag
      if (typeof plugin.enabled !== "undefined") {
        return !!plugin.enabled;
      }
      
      // Check config
      if (plugin.config && typeof plugin.config.enabled !== "undefined") {
        return !!plugin.config.enabled;
      }
      
      // Default enabled
      return true;
    } catch (e) {
      logger.warn("isPluginEnabled check failed:", e.message);
      return false;
    }
  }

  async function reloadEngine() {
    try {
      if (app?.locals?.pluginEngine?.reload) {
        await app.locals.pluginEngine.reload();
        return true;
      } else if (loader?.loadAll) {
        await loader.loadAll();
        return true;
      }
      return false;
    } catch (e) {
      logger.error("Engine reload failed:", e.message);
      return false;
    }
  }

  // ============================================
  // Routes
  // ============================================

  // List all plugins
  router.get("/", async (req, res) => {
    try {
      const pluginsList = registry.list();
      return res.json({ ok: true, plugins: pluginsList });
    } catch (err) {
      logger.error("GET /api/plugins error:", err);
      return res.status(500).json({ 
        ok: false, 
        error: err.message 
      });
    }
  });

  // Get plugin metadata
  router.get("/:pluginId/metadata", validatePluginId, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const plugin = registry.get(pluginId);
      
      if (!plugin) {
        return res.status(404).json({ 
          ok: false, 
          error: "plugin_not_found" 
        });
      }

      const manifest = plugin.manifest || {};
      
      return res.json({
        ok: true,
        metadata: {
          id: plugin.id || pluginId,
          name: plugin.name || manifest.name || pluginId,
          version: plugin.version || manifest.version || "1.0.0",
          description: manifest.description,
          author: manifest.author,
          enabled: isPluginEnabled(pluginId),
          loadedAt: plugin.loadedAt || null,
          manifest
        }
      });
    } catch (err) {
      logger.error("GET /api/plugins/:pluginId/metadata error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // List plugin actions
  router.get("/:pluginId/actions", validatePluginId, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const actions = registry.listActions(pluginId);
      
      return res.json({ 
        ok: true, 
        pluginId, 
        actions: actions || [] 
      });
    } catch (err) {
      logger.error("GET /api/plugins/:pluginId/actions error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Run plugin action with timeout
  router.post(
    "/:pluginId/actions/:actionName",
    validatePluginId,
    validateActionName,
    async (req, res) => {
      try {
        const { pluginId, actionName } = req.params;

        // Check if enabled
        if (!isPluginEnabled(pluginId)) {
          logEvent({ 
            event: "action_blocked_disabled", 
            pluginId, 
            actionName 
          });
          return res.status(403).json({ 
            ok: false, 
            error: "plugin_disabled" 
          });
        }

        // Check if engine available
        if (!app?.locals?.pluginEngine?.runAction) {
          return res.status(500).json({ 
            ok: false, 
            error: "plugin_engine_unavailable" 
          });
        }

        // Execute with timeout
        const timeoutMs = 30000; // 30 seconds
        const execution = app.locals.pluginEngine.runAction(
          pluginId,
          actionName,
          req.body || {}
        );

        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Action timeout")), timeoutMs)
        );

        const result = await Promise.race([execution, timeout]);

        logEvent({ 
          event: "action_executed", 
          pluginId, 
          actionName, 
          success: true 
        });

        return res.json({ ok: true, result });
      } catch (err) {
        logger.error("POST /api/plugins/:pluginId/actions/:actionName error:", err);
        
        logEvent({ 
          event: "action_failed", 
          pluginId: req.params.pluginId, 
          actionName: req.params.actionName,
          error: err.message 
        });

        return res.status(500).json({ ok: false, error: err.message });
      }
    }
  );

  // Install from folder
  router.post("/install/folder", async (req, res) => {
    try {
      const { pluginId, sourceDir } = req.body;

      if (!pluginId || !PLUGIN_ID_REGEX.test(pluginId)) {
        return res.status(400).json({ 
          ok: false, 
          error: "invalid_plugin_id" 
        });
      }

      if (!sourceDir) {
        return res.status(400).json({ 
          ok: false, 
          error: "missing_source_dir" 
        });
      }

      const src = path.resolve(sourceDir);
      
      // Security: prevent path traversal
      if (!src.startsWith(path.resolve(process.cwd()))) {
        return res.status(403).json({ 
          ok: false, 
          error: "access_denied" 
        });
      }

      const srcExists = await fs.access(src)
        .then(() => true)
        .catch(() => false);

      if (!srcExists) {
        return res.status(400).json({ 
          ok: false, 
          error: "source_not_found" 
        });
      }

      const dest = path.join(pluginsDir, pluginId);
      const destExists = await fs.access(dest)
        .then(() => true)
        .catch(() => false);

      if (destExists) {
        return res.status(409).json({ 
          ok: false, 
          error: "plugin_already_exists" 
        });
      }

      await copyRecursive(src, dest);
      await reloadEngine();

      logEvent({ 
        event: "plugin_installed_folder", 
        pluginId, 
        sourceDir: src 
      });

      return res.json({ 
        ok: true, 
        installed: pluginId, 
        path: dest 
      });
    } catch (err) {
      logger.error("POST /install/folder error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Install from ZIP
  router.post("/install/zip", upload.single("file"), async (req, res) => {
    let tmpExtractDir = null;

    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ 
          ok: false, 
          error: "missing_file" 
        });
      }

      tmpExtractDir = path.join(
        uploadsTmp,
        `extract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      );

      await fs.mkdir(tmpExtractDir, { recursive: true });

      // Extract ZIP
      try {
        const zip = new AdmZip(file.path);
        zip.extractAllTo(tmpExtractDir, true);
      } catch (err) {
        throw new Error(`ZIP extraction failed: ${err.message}`);
      }

      const topEntries = await fs.readdir(tmpExtractDir, { withFileTypes: true });

// Accept plugin ID from multiple sources (multipart-safe)
let pluginId =
  req.body?.plugin_id ||     // ✅ frontend FormData
  req.body?.pluginId ||      // camelCase fallback
  req.query?.plugin_id ||    // optional fallback
  req.query?.pluginId ||     
  null;

      // Auto-detect plugin ID from single folder
      if (!pluginId && topEntries.length === 1 && topEntries[0].isDirectory()) {
        const folderName = topEntries[0].name;
        if (PLUGIN_ID_REGEX.test(folderName)) {
          pluginId = folderName;
        }
      }

      if (!pluginId) {
        throw new Error("plugin_id_required");
      }

      if (!PLUGIN_ID_REGEX.test(pluginId)) {
        throw new Error("invalid_plugin_id");
      }

      const dest = path.join(pluginsDir, pluginId);
      const destExists = await fs.access(dest)
        .then(() => true)
        .catch(() => false);

      if (destExists) {
        throw new Error("plugin_already_exists");
      }

      // Determine source to copy
      let srcToCopy;
      if (topEntries.length === 1 && topEntries[0].name === pluginId) {
        srcToCopy = path.join(tmpExtractDir, pluginId);
      } else {
        srcToCopy = tmpExtractDir;
      }

      await copyRecursive(srcToCopy, dest);
      await reloadEngine();

      logEvent({ 
        event: "plugin_installed_zip", 
        pluginId, 
        originalName: file.originalname 
      });

      return res.json({ 
        ok: true, 
        installed: pluginId, 
        path: dest 
      });
    } catch (err) {
      logger.error("POST /install/zip error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    } finally {
      // Cleanup
      if (req.file?.path) {
        await removeRecursive(req.file.path);
      }
      if (tmpExtractDir) {
        await removeRecursive(tmpExtractDir);
      }
    }
  });

  // Uninstall plugin (move to trash)
  router.delete("/:pluginId", validatePluginId, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const { actor = "system" } = req.body;

      const src = path.join(pluginsDir, pluginId);
      const srcExists = await fs.access(src)
        .then(() => true)
        .catch(() => false);

      if (!srcExists) {
        return res.status(404).json({ 
          ok: false, 
          error: "plugin_not_found" 
        });
      }

      // Create backup
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = `${pluginId}_${ts}.zip`;
      const backupPath = path.join(backupsBase, backupName);
      const backupCreated = await createBackupZip(src, backupPath);

      // Move to trash
      const trashDest = path.join(trashBase, pluginId, ts);
      await fs.mkdir(path.dirname(trashDest), { recursive: true });
      await fs.rename(src, trashDest);

      // Update registry
      try {
        const meta = registry.get(pluginId);
        if (registry.trashPlugin) {
          registry.trashPlugin(pluginId, { 
            trashedAt: new Date(), 
            trashPath: trashDest, 
            meta 
          });
        } else if (registry.remove) {
          registry.remove(pluginId);
        }
      } catch (e) {
        logger.warn("Registry cleanup failed:", e.message);
      }

      await reloadEngine();

      logEvent({ 
        event: "plugin_uninstalled", 
        pluginId, 
        actor, 
        trashPath: trashDest,
        backup: backupCreated ? backupPath : null 
      });

      return res.json({
        ok: true,
        removed: pluginId,
        trashed: true,
        trashPath: trashDest,
        backup: backupCreated ? backupPath : null
      });
    } catch (err) {
      logger.error("DELETE /api/plugins/:pluginId error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // List trash
  router.get("/trash/list", async (req, res) => {
    try {
      let trash = [];

      if (registry.listTrash) {
        trash = registry.listTrash() || [];
      }

      // Fallback to filesystem scan
      if (!trash || trash.length === 0) {
        const trashExists = await fs.access(trashBase)
          .then(() => true)
          .catch(() => false);

        if (trashExists) {
          const pluginIds = await fs.readdir(trashBase, { withFileTypes: true });
          
          for (const dirent of pluginIds) {
            if (!dirent.isDirectory()) continue;
            
            const pid = dirent.name;
            const pidDir = path.join(trashBase, pid);
            
            try {
              const timestamps = await fs.readdir(pidDir, { withFileTypes: true });
              const latest = timestamps
                .filter(d => d.isDirectory())
                .map(d => d.name)
                .sort()
                .reverse()[0];

              if (latest) {
                trash.push({
                  id: pid,
                  name: pid,
                  trashedAt: latest,
                  trashPath: path.join(pidDir, latest)
                });
              }
            } catch (e) {
              // Skip if can't read
            }
          }
        }
      }

      return res.json({ ok: true, trash });
    } catch (err) {
      logger.error("GET /api/plugins/trash/list error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Restore from trash
  router.post("/:pluginId/restore", validatePluginId, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const { actor = "system" } = req.body;

      let trashEntry = null;
      if (registry.getTrash) {
        trashEntry = registry.getTrash(pluginId);
      }

      let trashPath = trashEntry?.trashPath;

      if (!trashPath) {
        const candidateDir = path.join(trashBase, pluginId);
        const candidateExists = await fs.access(candidateDir)
          .then(() => true)
          .catch(() => false);

        if (!candidateExists) {
          return res.status(404).json({ 
            ok: false, 
            error: "plugin_not_in_trash" 
          });
        }

        const timestamps = await fs.readdir(candidateDir, { withFileTypes: true });
        const latest = timestamps
          .filter(d => d.isDirectory())
          .map(d => d.name)
          .sort()
          .reverse()[0];

        if (!latest) {
          return res.status(404).json({ 
            ok: false, 
            error: "plugin_not_in_trash" 
          });
        }

        trashPath = path.join(candidateDir, latest);
      }

      const dest = path.join(pluginsDir, pluginId);
      const destExists = await fs.access(dest)
        .then(() => true)
        .catch(() => false);

      if (destExists) {
        return res.status(409).json({ 
          ok: false, 
          error: "plugin_already_exists" 
        });
      }

      await fs.rename(trashPath, dest);

      // Update registry
      try {
        if (registry.restorePlugin) {
          registry.restorePlugin(pluginId);
        } else if (registry.registerPlugin) {
          registry.registerPlugin(pluginId, { 
            id: pluginId, 
            folder: dest, 
            restoredAt: new Date(),
            enabled: true 
          });
        }
      } catch (e) {
        logger.warn("Registry restore failed:", e.message);
      }

      await reloadEngine();

      logEvent({ 
        event: "plugin_restored", 
        pluginId, 
        actor, 
        from: trashPath,
        to: dest 
      });

      return res.json({ 
        ok: true, 
        restored: pluginId, 
        path: dest 
      });
    } catch (err) {
      logger.error("POST /api/plugins/:pluginId/restore error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Permanent delete from trash
  router.delete("/trash/:pluginId", validatePluginId, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const { actor = "system" } = req.body;

      let trashEntry = null;
      if (registry.getTrash) {
        trashEntry = registry.getTrash(pluginId);
      }

      let trashPath = trashEntry?.trashPath;

      if (!trashPath) {
        const candidateDir = path.join(trashBase, pluginId);
        const candidateExists = await fs.access(candidateDir)
          .then(() => true)
          .catch(() => false);

        if (!candidateExists) {
          return res.status(404).json({ 
            ok: false, 
            error: "plugin_not_in_trash" 
          });
        }

        trashPath = candidateDir; // Delete entire plugin folder
      }

      await removeRecursive(trashPath);

      // Update registry
      try {
        if (registry.deleteFromTrash) {
          registry.deleteFromTrash(pluginId);
        }
      } catch (e) {
        logger.warn("Registry delete failed:", e.message);
      }

      logEvent({ 
        event: "plugin_permanently_deleted", 
        pluginId, 
        actor 
      });

      return res.json({ 
        ok: true, 
        deleted: pluginId 
      });
    } catch (err) {
      logger.error("DELETE /api/plugins/trash/:pluginId error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Get/set plugin config
  router.get("/:pluginId/config", validatePluginId, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const plugin = registry.get(pluginId);
      
      if (!plugin) {
        return res.status(404).json({ 
          ok: false, 
          error: "plugin_not_found" 
        });
      }

      return res.json({ 
        ok: true, 
        config: plugin.config || {} 
      });
    } catch (err) {
      logger.error("GET /api/plugins/:pluginId/config error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post("/:pluginId/config", validatePluginId, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const config = req.body || {};

      const plugin = registry.get(pluginId);
      if (!plugin) {
        return res.status(404).json({ 
          ok: false, 
          error: "plugin_not_found" 
        });
      }

      // Update config
      plugin.config = { ...plugin.config, ...config };

      // Handle enabled flag
      if (typeof config.enabled !== "undefined") {
        plugin.enabled = !!config.enabled;
        
        logEvent({ 
          event: "plugin_enabled_changed", 
          pluginId, 
          enabled: plugin.enabled 
        });
      }

      return res.json({ ok: true, saved: true });
    } catch (err) {
      logger.error("POST /api/plugins/:pluginId/config error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};