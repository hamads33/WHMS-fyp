// src/modules/plugins/routes/plugins.routes.js
// Final unified plugin routes file (updated: plugin disable enforcement)
// - List plugins
// - Metadata
// - Actions
// - Run actions (blocked if plugin disabled)
// - Menu
// - Config (get/save) — saving `enabled` will update plugin state
// - Install (folder + zip)
// - Uninstall -> backup -> soft-trash
// - Trash list
// - Restore
// - Permanent delete
// - Uses loader + registry + app.locals.pluginEngine
//
// Dependencies: express, fs, path, AdmZip, multer

const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const AdmZip = require("adm-zip");
const multer = require("multer");

module.exports = function pluginsRoutes({
  logger = console,
  registry,
  prisma, // optional
  loader,
  app
} = {}) {
  if (!registry) throw new Error("pluginsRoutes requires { registry }");

  const router = express.Router();

  // Base paths
  const pluginsDir = path.join(process.cwd(), "plugins", "actions");
  const trashBase = path.join(process.cwd(), "plugins", "_trash");
  const backupsBase = path.join(process.cwd(), "plugins", "_backups");
  const logsDir = path.join(process.cwd(), "logs");
  const eventsLogFile = path.join(logsDir, "plugin-events.log");
  const uploadsTmp = path.join(os.tmpdir(), "plugin-uploads");

  // Ensure required directories exist
  ensureDir(pluginsDir);
  ensureDir(trashBase);
  ensureDir(backupsBase);
  ensureDir(logsDir);
  ensureDir(uploadsTmp);

  const upload = multer({
    dest: uploadsTmp,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
  });

  // -------------------
  // Helpers
  // -------------------

  function ensureDir(dir) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      logger && logger.warn && logger.warn("ensureDir failed for", dir, e.message || e);
    }
  }

  function logEvent(event) {
    try {
      const line = JSON.stringify(Object.assign({ ts: new Date().toISOString() }, event));
      fs.appendFileSync(eventsLogFile, line + "\n");
    } catch (e) {
      logger && logger.warn && logger.warn("plugins.routes: failed to write event log", e.message || e);
    }
  }

  function copyRecursive(src, dst) {
    ensureDir(dst);
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      const s = path.join(src, entry);
      const d = path.join(dst, entry);
      const stat = fs.lstatSync(s);
      if (stat.isDirectory()) {
        copyRecursive(s, d);
      } else {
        fs.copyFileSync(s, d);
      }
    }
  }

  function removeRecursiveSafe(targetPath) {
    try {
      if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });
    } catch (e) {
      logger && logger.warn && logger.warn("removeRecursiveSafe failed", targetPath, e.message || e);
    }
  }

  function moveOrCopy(src, dest) {
    try {
      ensureDir(path.dirname(dest));
      fs.renameSync(src, dest);
      return true;
    } catch (e) {
      try {
        copyRecursive(src, dest);
        removeRecursiveSafe(src);
        return true;
      } catch (e2) {
        logger && logger.warn && logger.warn("moveOrCopy failed", src, dest, e.message || e2.message || e2);
        return false;
      }
    }
  }

  function createBackupZip(srcFolder, destZipPath) {
    try {
      ensureDir(path.dirname(destZipPath));
      const zip = new AdmZip();
      zip.addLocalFolder(srcFolder);
      zip.writeZip(destZipPath);
      return true;
    } catch (e) {
      logger && logger.warn && logger.warn("createBackupZip failed", e.message || e);
      return false;
    }
  }

  function extractZipToDir(zipPath, destDir) {
    try {
      ensureDir(destDir);
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(destDir, true);
      return true;
    } catch (e) {
      logger && logger.warn && logger.warn("extractZipToDir failed", e.message || e);
      return false;
    }
  }

  async function reloadEngineOnce() {
    try {
      if (app?.locals?.pluginEngine?.reload) {
        await app.locals.pluginEngine.reload();
      } else if (loader && typeof loader.loadAll === "function") {
        await loader.loadAll();
      } else if (app?.locals?.pluginEngine?.loadAll) {
        await app.locals.pluginEngine.loadAll();
      }
      return true;
    } catch (e) {
      logger && logger.warn && logger.warn("reloadEngineOnce failed", e.message || e);
      return false;
    }
  }

  function normalizeTrashEntry(entry) {
    if (!entry) return null;
    return {
      id: entry.id || entry.pluginId || null,
      name: entry.meta?.name || entry.name || entry.id,
      trashedAt: entry.trashedAt || null,
      trashPath: entry.trashPath || null,
      meta: entry.meta || null
    };
  }

  // -------------------
  // NEW: plugin enabled check
  // -------------------
  function isPluginEnabled(pluginId) {
    try {
      // 1) engine-level
      const engine = app?.locals?.pluginEngine;
      if (engine && engine.plugins && engine.plugins[pluginId]) {
        if (typeof engine.plugins[pluginId].enabled !== "undefined") {
          return !!engine.plugins[pluginId].enabled;
        }
      }

      // 2) registry-level plugin object
      const regPlugin = registry.get ? registry.get(pluginId) : null;
      if (regPlugin) {
        if (typeof regPlugin.enabled !== "undefined") return !!regPlugin.enabled;
        // check config on plugin object
        if (regPlugin.config && typeof regPlugin.config.enabled !== "undefined") return !!regPlugin.config.enabled;
      }

      // 3) registry.getConfig (API)
      if (typeof registry.getConfig === "function") {
        try {
          const cfg = registry.getConfig(pluginId);
          if (cfg && typeof cfg.enabled !== "undefined") return !!cfg.enabled;
        } catch (e) {
          // ignore and fallback
        }
      }

      // 4) registry.getTrash/get etc don't matter here; default to enabled
      return true;
    } catch (e) {
      logger && logger.warn && logger.warn("isPluginEnabled check failed", e.message || e);
      // default to safe side: allow if uncertain? better to block? We'll default to true to avoid breaking,
      // but we log above — you may change default to false if you prefer fail-closed.
      return true;
    }
  }

  // -------------------
  // Routes
  // -------------------

  // GET /api/plugins
  router.get("/", (req, res) => {
    try {
      const engine = app?.locals?.pluginEngine;
      const plugins = engine?.plugins || {};
      return res.json({ ok: true, plugins });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // GET /api/plugins/:pluginId/metadata
  router.get("/:pluginId/metadata", (req, res) => {
    try {
      const pluginId = req.params.pluginId;
      const plugin = registry.get(pluginId);
      if (!plugin) return res.status(404).json({ ok: false, error: "plugin_not_found" });

      const manifest = plugin.manifest || {};
      return res.json({
        ok: true,
        metadata: {
          id: plugin.id || pluginId,
          name: plugin.name || manifest.name || pluginId,
          version: plugin.version || manifest.version || "1.0.0",
          manifest,
          enabled: plugin.enabled !== false,
          folder: plugin.folder || null,
          installedAt: plugin.installedAt || null
        }
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // GET /api/plugins/:pluginId/actions
  router.get("/:pluginId/actions", (req, res) => {
    try {
      const pluginId = req.params.pluginId;
      const actions = registry.getActions ? registry.getActions(pluginId) : [];
      if (!actions) return res.status(404).json({ ok: false, error: "plugin_not_found" });
      return res.json({ ok: true, pluginId, actions });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // POST /api/plugins/:pluginId/actions/:actionName -> run an action (blocked if disabled)
  router.post("/:pluginId/actions/:actionName", async (req, res) => {
    try {
      const { pluginId, actionName } = req.params;

      if (!isPluginEnabled(pluginId)) {
        logEvent({ event: "plugin_action_blocked_disabled", pluginId, action: actionName, body: req.body || {} });
        return res.status(403).json({ ok: false, error: "plugin_disabled" });
      }

      if (!app?.locals?.pluginEngine || typeof app.locals.pluginEngine.runAction !== "function") {
        return res.status(500).json({ ok: false, error: "plugin_engine_unavailable" });
      }

      const result = await app.locals.pluginEngine.runAction(pluginId, actionName, req.body || {});
      return res.json({ ok: true, result });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // POST /api/plugins/:pluginId/run/:actionName (alias) -> run action (blocked if disabled)
  router.post("/:pluginId/run/:actionName", async (req, res) => {
    try {
      const { pluginId, actionName } = req.params;

      if (!isPluginEnabled(pluginId)) {
        logEvent({ event: "plugin_action_blocked_disabled", pluginId, action: actionName, body: req.body || {} });
        return res.status(403).json({ ok: false, error: "plugin_disabled" });
      }

      if (!app?.locals?.pluginEngine || typeof app.locals.pluginEngine.runAction !== "function") {
        return res.status(500).json({ ok: false, error: "plugin_engine_unavailable" });
      }

      const result = await app.locals.pluginEngine.runAction(pluginId, actionName, req.body || {});
      return res.json({ ok: true, result });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // GET /api/plugins/:pluginId/menu
  router.get("/:pluginId/menu", (req, res) => {
    try {
      const pluginId = req.params.pluginId;
      const plugin = registry.get(pluginId);
      if (!plugin) return res.status(404).json({ ok: false, error: "plugin_not_found" });
      const manifest = plugin.manifest || {};
      return res.json({ ok: true, menu: manifest.menu || [] });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // GET /api/plugins/:pluginId/config
  router.get("/:pluginId/config", (req, res) => {
    try {
      const pluginId = req.params.pluginId;
      const plugin = registry.get(pluginId);
      if (!plugin) return res.status(404).json({ ok: false, error: "plugin_not_found" });
      return res.json({ ok: true, config: plugin.config || {} });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // POST /api/plugins/:pluginId/config -> save plugin config (and honor enabled change)
  router.post("/:pluginId/config", (req, res) => {
    try {
      const pluginId = req.params.pluginId;
      const payload = req.body || {};

      // Persist config via registry.setConfig if available
      try {
        if (typeof registry.setConfig === "function") {
          registry.setConfig(pluginId, payload);
        } else {
          // if registry doesn't support setConfig, attempt to attach to plugin object
          const p = registry.get ? registry.get(pluginId) : null;
          if (p) {
            p.config = Object.assign({}, p.config || {}, payload);
          }
        }
      } catch (e) {
        logger && logger.warn && logger.warn("setConfig failed", e.message || e);
      }

      // If payload contains enabled flag, update plugin.enabled if possible (so isPluginEnabled sees it)
      if (typeof payload.enabled !== "undefined") {
        const enabledVal = !!payload.enabled;
        try {
          // Update engine-level plugin if exists
          if (app?.locals?.pluginEngine?.plugins && app.locals.pluginEngine.plugins[pluginId]) {
            app.locals.pluginEngine.plugins[pluginId].enabled = enabledVal;
          }
          // Update registry-level plugin object if exists
          const p = registry.get ? registry.get(pluginId) : null;
          if (p) {
            p.enabled = enabledVal;
            // also persist to config if recommended
            p.config = Object.assign({}, p.config || {}, { enabled: enabledVal });
          }
          // If registry exposes setConfig, ensure config saved
          if (typeof registry.setConfig === "function") {
            registry.setConfig(pluginId, Object.assign({}, (p && p.config) || {}, { enabled: enabledVal }));
          }
        } catch (e) {
          logger && logger.warn && logger.warn("saving enabled flag failed", e.message || e);
        }

        logEvent({ event: "plugin_enabled_changed", pluginId, enabled: enabledVal });
      }

      return res.json({ ok: true, saved: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // ---------------------------
  // INSTALL: Folder
  router.post("/install/folder", async (req, res) => {
    try {
      const { pluginId, sourceDir, productId, folderPath } = req.body || {};

      // Accept aliases for backwards compatibility (productId -> pluginId, folderPath -> sourceDir)
      const resolvedPluginId = pluginId || productId || null;
      const resolvedSourceDir = sourceDir || folderPath || null;

      if (!resolvedPluginId || !resolvedSourceDir) return res.status(400).json({ ok: false, error: "missing_fields" });

      const src = path.resolve(resolvedSourceDir);
      if (!fs.existsSync(src)) return res.status(400).json({ ok: false, error: "source_not_found" });

      const dest = path.join(pluginsDir, resolvedPluginId);
      if (fs.existsSync(dest)) return res.status(409).json({ ok: false, error: "plugin_exists" });

      copyRecursive(src, dest);

      // registry register fallback
      try {
        if (typeof registry.registerPlugin === "function") {
          registry.registerPlugin(resolvedPluginId, { id: resolvedPluginId, folder: dest, installedAt: new Date(), enabled: true });
        } else {
          const p = registry.get ? registry.get(resolvedPluginId) : null;
          if (p) {
            p.folder = dest;
            p.installedAt = new Date();
            p.enabled = true;
          }
        }
      } catch (e) {
        logger && logger.warn && logger.warn("install/folder: registry.registerPlugin failed", e.message || e);
      }

      await reloadEngineOnce();

      logEvent({ event: "plugin_installed_folder", pluginId: resolvedPluginId, sourceDir: src, dest });

      return res.json({ ok: true, installed: resolvedPluginId, folder: dest });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // ---------------------------
  // INSTALL: ZIP upload
  router.post("/install/zip", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ ok: false, error: "missing_file" });

      const tmpExtractDir = path.join(uploadsTmp, `extract_${Date.now()}_${Math.round(Math.random() * 9999)}`);
      ensureDir(tmpExtractDir);

      const extracted = extractZipToDir(file.path, tmpExtractDir);
      if (!extracted) {
        removeRecursiveSafe(tmpExtractDir);
        removeRecursiveSafe(file.path);
        return res.status(500).json({ ok: false, error: "zip_extract_failed" });
      }

      const topEntries = fs.readdirSync(tmpExtractDir);
      let pluginId = req.body.pluginId || null;

      if (!pluginId) {
        if (topEntries.length === 1 && fs.lstatSync(path.join(tmpExtractDir, topEntries[0])).isDirectory()) {
          pluginId = topEntries[0];
        } else {
          removeRecursiveSafe(tmpExtractDir);
          removeRecursiveSafe(file.path);
          return res.status(400).json({ ok: false, error: "pluginId_required_for_flat_zip" });
        }
      }

      const dest = path.join(pluginsDir, pluginId);
      if (fs.existsSync(dest)) {
        removeRecursiveSafe(tmpExtractDir);
        removeRecursiveSafe(file.path);
        return res.status(409).json({ ok: false, error: "plugin_exists" });
      }

      let srcToCopy;
      if (topEntries.length === 1 && topEntries[0] === pluginId) {
        srcToCopy = path.join(tmpExtractDir, topEntries[0]);
      } else {
        srcToCopy = tmpExtractDir;
      }

      copyRecursive(srcToCopy, dest);

      try {
        if (typeof registry.registerPlugin === "function") {
          registry.registerPlugin(pluginId, { id: pluginId, folder: dest, installedAt: new Date(), enabled: true });
        } else {
          const p = registry.get ? registry.get(pluginId) : null;
          if (p) {
            p.folder = dest;
            p.installedAt = new Date();
            p.enabled = true;
          }
        }
      } catch (e) {
        logger && logger.warn && logger.warn("install/zip: registry.registerPlugin failed", e.message || e);
      }

      removeRecursiveSafe(tmpExtractDir);
      removeRecursiveSafe(file.path);

      await reloadEngineOnce();

      logEvent({ event: "plugin_installed_zip", pluginId, dest });

      return res.json({ ok: true, installed: pluginId, folder: dest });
    } catch (err) {
      logger && logger.error && logger.error("install/zip error", err);
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // ---------------------------
  // UNINSTALL -> backup -> move to trash
  router.delete("/:pluginId", async (req, res) => {
    try {
      const pluginId = req.params.pluginId;
      const { removeFiles = false, actor = "system" } = req.body || {};

      const src = path.join(pluginsDir, pluginId);
      if (!fs.existsSync(src)) {
        if (typeof registry.remove === "function") registry.remove(pluginId);
        return res.status(404).json({ ok: false, error: "plugin_not_found" });
      }

      ensureDir(backupsBase);

      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = `${pluginId}_${ts}.zip`;
      const backupPath = path.join(backupsBase, backupName);

      const backupCreated = createBackupZip(src, backupPath);

      const trashDest = path.join(trashBase, pluginId, ts);
      ensureDir(path.dirname(trashDest));
      ensureDir(trashDest);

      const moved = moveOrCopy(src, trashDest);

      try {
        const meta = registry.get ? registry.get(pluginId) : { id: pluginId, name: pluginId };
        if (typeof registry.trashPlugin === "function") {
          registry.trashPlugin(pluginId, { trashedAt: new Date(), trashPath: trashDest, meta });
        } else if (typeof registry.remove === "function") {
          registry.remove(pluginId);
        }
      } catch (e) {
        logger && logger.warn && logger.warn("DELETE plugin: registry.trashPlugin/remove failed", e.message || e);
      }

      if (removeFiles) {
        try {
          if (fs.existsSync(src)) removeRecursiveSafe(src);
        } catch (e) {
          logger && logger.warn && logger.warn("DELETE plugin: removeFiles cleanup failed", e.message || e);
        }
      }

      await reloadEngineOnce();

      logEvent({
        event: "plugin_uninstalled",
        pluginId,
        actor,
        trashed: moved,
        trashPath: moved ? trashDest : null,
        backup: backupCreated ? backupPath : null
      });

      return res.json({
        ok: true,
        removed: pluginId,
        trashed: moved,
        trashPath: moved ? trashDest : null,
        backup: backupCreated ? backupPath : null
      });
    } catch (err) {
      logger && logger.error && logger.error("DELETE /api/plugins/:pluginId error", err);
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // ---------------------------
  // TRASH LIST
  router.get("/trash/list", (req, res) => {
    try {
      let list = [];
      if (typeof registry.listTrash === "function") {
        try {
          list = registry.listTrash() || [];
        } catch (e) {
          logger && logger.warn && logger.warn("registry.listTrash failed, falling back to fs scan", e.message || e);
          list = [];
        }
      }

      // If registry returned empty array (or not supported), fallback to scanning _trash
      if (!Array.isArray(list) || list.length === 0) {
        const pluginIds = fs.existsSync(trashBase)
          ? fs.readdirSync(trashBase, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
          : [];
        list = pluginIds.map(pid => {
          const pidDir = path.join(trashBase, pid);
          let timestamps = [];
          try {
            timestamps = fs.readdirSync(pidDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
          } catch (e) {
            timestamps = [];
          }
          const latest = timestamps.sort().reverse()[0] || null;
          const trashPath = latest ? path.join(pidDir, latest) : null;
          return { id: pid, name: pid, trashedAt: latest, trashPath, meta: null };
        });
      }

      const payload = (Array.isArray(list) ? list : []).map(normalizeTrashEntry);
      return res.json({ ok: true, trash: payload });
    } catch (err) {
      logger && logger.error && logger.error("GET /api/plugins/trash/list error", err);
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // ---------------------------
  // RESTORE
  router.post("/:pluginId/restore", async (req, res) => {
    try {
      const pluginId = req.params.pluginId;
      const { actor = "system" } = req.body || {};

      const trashEntry = (typeof registry.getTrash === "function") ? registry.getTrash(pluginId) : null;
      let trashPath = trashEntry?.trashPath || null;
      if (!trashPath) {
        const candidateDir = path.join(trashBase, pluginId);
        if (!fs.existsSync(candidateDir)) {
          return res.status(404).json({ ok: false, error: "plugin_not_in_trash" });
        }
        const timestamps = fs.readdirSync(candidateDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
        const latest = timestamps.sort().reverse()[0];
        if (!latest) return res.status(404).json({ ok: false, error: "plugin_not_in_trash" });
        trashPath = path.join(candidateDir, latest);
      }

      if (!fs.existsSync(trashPath)) return res.status(500).json({ ok: false, error: "trash_path_missing" });

      const dest = path.join(pluginsDir, pluginId);
      if (fs.existsSync(dest)) return res.status(409).json({ ok: false, error: "target_already_exists" });

      const moved = moveOrCopy(trashPath, dest);
      if (!moved) return res.status(500).json({ ok: false, error: "restore_move_failed" });

      try {
        if (fs.existsSync(trashPath)) removeRecursiveSafe(trashPath);
      } catch (e) { /* ignore */ }

      try {
        if (typeof registry.restorePlugin === "function") {
          registry.restorePlugin(pluginId);
        } else if (typeof registry.registerPlugin === "function") {
          registry.registerPlugin(pluginId, { id: pluginId, folder: dest, restoredAt: new Date(), enabled: true });
        } else {
          const p = registry.get ? registry.get(pluginId) : null;
          if (p) {
            p.folder = dest;
            p.restoredAt = new Date();
            p.enabled = true;
          }
        }
      } catch (e) {
        logger && logger.warn && logger.warn("restore: registry restore/register failed", e.message || e);
      }

      await reloadEngineOnce();

      logEvent({ event: "plugin_restored", pluginId, actor, restoredFrom: trashPath, restoredTo: dest });

      return res.json({ ok: true, restored: pluginId, folder: dest });
    } catch (err) {
      logger && logger.error && logger.error("POST /api/plugins/:pluginId/restore error", err);
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // ---------------------------
  // PERMANENT DELETE from trash
  router.delete("/trash/:pluginId", async (req, res) => {
    try {
      const pluginId = req.params.pluginId;
      const { actor = "system" } = req.body || {};

      const trashEntry = (typeof registry.getTrash === "function") ? registry.getTrash(pluginId) : null;
      let trashPath = trashEntry?.trashPath || null;

      if (!trashPath) {
        const candidateDir = path.join(trashBase, pluginId);
        if (!fs.existsSync(candidateDir)) return res.status(404).json({ ok: false, error: "plugin_not_in_trash" });
        const timestamps = fs.readdirSync(candidateDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
        const latest = timestamps.sort().reverse()[0];
        if (!latest) return res.status(404).json({ ok: false, error: "plugin_not_in_trash" });
        trashPath = path.join(candidateDir, latest);
      }

      try {
        if (trashPath && fs.existsSync(trashPath)) removeRecursiveSafe(trashPath);
      } catch (e) {
        logger && logger.warn && logger.warn("permanent delete: rmSync failed", e.message || e);
      }

      try {
        if (typeof registry.deleteFromTrash === "function") {
          registry.deleteFromTrash(pluginId);
        } else if (typeof registry.remove === "function") {
          registry.remove(pluginId);
        }
      } catch (e) {
        logger && logger.warn && logger.warn("permanent delete: registry cleanup failed", e.message || e);
      }

      logEvent({ event: "plugin_trash_deleted", pluginId, actor, trashPath });

      return res.json({ ok: true, deleted: pluginId });
    } catch (err) {
      logger && logger.error && logger.error("DELETE /api/plugins/trash/:pluginId error", err);
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // Return router
  return router;
};
