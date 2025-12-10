// src/modules/plugins/routes/pluginConfig.routes.js
// Plugin configuration & lightweight host API
// - GET  /api/plugins/:pluginId/config   -> manifest UI + configSchema + current settings
// - POST /api/plugins/:pluginId/config   -> validate (if schema) and upsert settings
// - POST /api/plugins/:pluginId/test-action -> run action via plugin engine (vm/wasm)
// - GET  /api/plugins/menu               -> list menu contributions for sidebar
//
// Usage: require and mount inside your plugin init:
// app.use("/api/plugins", pluginConfigRoutes({ prisma, registry, logger, app, ajv }));

const express = require("express");
const Ajv = require("ajv");

module.exports = function pluginConfigRoutes({ prisma, registry, logger = console, app, ajv: externalAjv } = {}) {
  if (!prisma) throw new Error("pluginConfigRoutes requires { prisma }");
  if (!registry) throw new Error("pluginConfigRoutes requires { registry }");

  const router = express.Router();
  const ajv = externalAjv || new Ajv({ allErrors: true, strict: false });

  // Helper: convert pluginSetting rows to { key: value }
  async function loadSettingsFor(pluginId) {
    const rows = await prisma.pluginSetting.findMany({
      where: { pluginId },
    });
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  // GET menu contributions (simple aggregated list)
  router.get("/menu", async (req, res) => {
    try {
      // registry.list() returns plugin metadata objects (loader registered)
      const list = Array.isArray(registry.list ? registry.list() : []) ? registry.list() : [];
      const menu = list
        .map(p => {
          const manifest = (p && p.manifest) || {};
          const ui = manifest.ui || {};
          if (!ui || !ui.menu) return null;
          return {
            id: p.id,
            name: p.name,
            version: p.version,
            menu: ui.menu,
          };
        })
        .filter(Boolean);
      return res.json({ ok: true, menu });
    } catch (err) {
      logger.error("GET /api/plugins/menu error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET plugin consolidated config (manifest.ui + configSchema + saved settings)
  router.get("/:pluginId/config", async (req, res) => {
    try {
      const pluginId = req.params.pluginId;

      // registry.get returns plugin meta registered by loader
      const meta = registry.get(pluginId);
      if (!meta) return res.status(404).json({ ok: false, error: "plugin_not_found" });

      const manifest = meta.manifest || {};
      const ui = manifest.ui || {};
      const configSchema = ui.configSchema || manifest.configSchema || null;

      // load current settings
      const settings = await loadSettingsFor(pluginId);

      return res.json({
        ok: true,
        pluginId,
        manifestMeta: { id: meta.id, name: meta.name, version: meta.version },
        ui,
        configSchema,
        settings,
      });
    } catch (err) {
      logger.error("GET /api/plugins/:pluginId/config error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST save plugin config (upsert). Expects body = { key1: val1, key2: val2, ... }
  router.post("/:pluginId/config", async (req, res) => {
    try {
      const pluginId = req.params.pluginId;
      const meta = registry.get(pluginId);
      if (!meta) return res.status(404).json({ ok: false, error: "plugin_not_found" });

      const manifest = meta.manifest || {};
      const configSchema = (manifest.ui && manifest.ui.configSchema) || manifest.configSchema || null;
      const payload = req.body || {};

      // Validate using JSON Schema if provided
      if (configSchema) {
        const validate = ajv.compile(configSchema);
        const ok = validate(payload);
        if (!ok) {
          return res.status(400).json({ ok: false, error: "validation_failed", details: validate.errors });
        }
      }

      // Upsert each key (requires @@unique([pluginId, key]) in Prisma schema)
      const upserted = [];
      for (const [key, value] of Object.entries(payload)) {
        const row = await prisma.pluginSetting.upsert({
          where: { pluginId_key: { pluginId, key } },
          create: { pluginId, key, value },
          update: { value },
        });
        upserted.push({ key: row.key, value: row.value });
      }

      // Best-effort audit log
      try {
        if (prisma && prisma.auditLog) {
          await prisma.auditLog.create({
            data: {
              source: "plugin",
              action: "plugin.config.update",
              actor: "system",
              level: "INFO",
              meta: { pluginId, keys: Object.keys(payload) },
            },
          });
        }
      } catch (e) {
        logger.warn("plugin config audit write failed", e.message || e);
      }

      return res.json({ ok: true, upserted });
    } catch (err) {
      logger.error("POST /api/plugins/:pluginId/config error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST run plugin action (example helper used by PluginSDK.callAction)
  // Body: { actionName: "myAction", meta: { ... } }
  router.post("/:pluginId/test-action", async (req, res) => {
    try {
      const pluginId = req.params.pluginId;
      const { actionName, meta: actionMeta = {} } = req.body || {};

      const action = registry.getAction ? registry.getAction(pluginId, actionName) : null;
      if (!action) return res.status(404).json({ ok: false, error: "action_not_found" });

      // Prefer app.locals.pluginEngine.runAction if available; otherwise try loader/vmExecutor/wasmExecutor
      try {
        if (app && app.locals && typeof app.locals.pluginEngine?.runAction === "function") {
          const result = await app.locals.pluginEngine.runAction(pluginId, actionName, actionMeta);
          return res.json({ ok: true, result });
        }

        // fallback: attempt to run via plugin loader executors if exposed
        if (app && app.locals && app.locals.pluginEngine) {
          const { vmExecutor, wasmExecutor, plugins } = app.locals.pluginEngine;
          const pluginEntry = plugins && plugins[pluginId];

          const pluginDir = pluginEntry ? (pluginEntry.base || pluginEntry.root) : null;

          if (action.runtime === "wasm" || action.type === "wasm") {
            if (!wasmExecutor || !wasmExecutor.run) throw new Error("wasm executor not available");
            const result = await wasmExecutor.run({
              pluginId,
              pluginDir,
              wasmFile: action.file,
              exportName: action.export || action.fnName || "run",
              meta: actionMeta,
            });
            return res.json({ ok: true, result });
          }

          // JS VM action
          if (!vmExecutor || !vmExecutor.run) throw new Error("vm executor not available");
          const result = await vmExecutor.run({
            pluginId,
            pluginDir,
            actionFile: action.file,
            fnName: action.fnName || "run",
            meta: actionMeta,
          });
          return res.json({ ok: true, result });
        }

        // last fallback: cannot execute
        return res.status(500).json({ ok: false, error: "plugin_engine_unavailable" });
      } catch (execErr) {
        logger.error("plugin action execution failed", execErr);
        return res.status(500).json({ ok: false, error: execErr.message || String(execErr) });
      }
    } catch (err) {
      logger.error("POST /api/plugins/:pluginId/test-action error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};
