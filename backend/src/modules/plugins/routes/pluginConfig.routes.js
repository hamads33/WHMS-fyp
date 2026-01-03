// src/modules/plugins/routes/pluginConfig.routes.js
// Secure plugin configuration routes with validation

const express = require("express");
const Ajv = require("ajv");

const PLUGIN_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

module.exports = function pluginConfigRoutes({
  prisma,
  registry,
  logger = console,
  app,
  ajv: externalAjv
} = {}) {
  if (!prisma) throw new Error("pluginConfigRoutes requires { prisma }");
  if (!registry) throw new Error("pluginConfigRoutes requires { registry }");

  const router = express.Router();
  const ajv = externalAjv || new Ajv({ allErrors: true, strict: false });

  /**
   * Validation middleware
   */
  function validatePluginId(req, res, next) {
    const pluginId = req.params.pluginId;
    if (!pluginId || !PLUGIN_ID_REGEX.test(pluginId)) {
      return res.status(400).json({
        ok: false,
        error: "invalid_plugin_id"
      });
    }
    next();
  }

  /**
   * Load plugin settings from database
   */
  async function loadSettingsFor(pluginId) {
    try {
      const rows = await prisma.pluginSetting.findMany({
        where: { pluginId }
      });
      
      const settings = {};
      for (const row of rows) {
        settings[row.key] = row.value;
      }
      
      return settings;
    } catch (err) {
      logger.error(`Failed to load settings for ${pluginId}:`, err.message);
      return {};
    }
  }

  /**
   * GET menu contributions
   */
  router.get("/menu", async (req, res) => {
    try {
      const plugins = registry.list ? registry.list() : [];
      
      const menu = plugins
        .map(p => {
          const manifest = p?.manifest || {};
          const ui = manifest.ui || {};
          
          if (!ui.menu) return null;
          
          return {
            id: p.id,
            name: p.name,
            version: p.version,
            menu: ui.menu
          };
        })
        .filter(Boolean);

      return res.json({ ok: true, menu });
    } catch (err) {
      logger.error("GET /api/plugins/menu error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET plugin config
   */
  router.get("/:pluginId/config", validatePluginId, async (req, res) => {
    try {
      const { pluginId } = req.params;

      const meta = registry.get(pluginId);
      if (!meta) {
        return res.status(404).json({ ok: false, error: "plugin_not_found" });
      }

      const manifest = meta.manifest || {};
      const ui = manifest.ui || {};
      const configSchema = ui.configSchema || manifest.configSchema || null;

      // Load saved settings
      const settings = await loadSettingsFor(pluginId);

      return res.json({
        ok: true,
        pluginId,
        manifestMeta: {
          id: meta.id,
          name: meta.name,
          version: meta.version
        },
        ui,
        configSchema,
        settings
      });
    } catch (err) {
      logger.error("GET /api/plugins/:pluginId/config error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST save plugin config
   */
  router.post("/:pluginId/config", validatePluginId, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const payload = req.body || {};

      const meta = registry.get(pluginId);
      if (!meta) {
        return res.status(404).json({ ok: false, error: "plugin_not_found" });
      }

      const manifest = meta.manifest || {};
      const configSchema =
        (manifest.ui && manifest.ui.configSchema) || manifest.configSchema || null;

      // Validate against schema if provided
      if (configSchema) {
        const validate = ajv.compile(configSchema);
        const valid = validate(payload);

        if (!valid) {
          return res.status(400).json({
            ok: false,
            error: "validation_failed",
            details: validate.errors
          });
        }
      }

      // Upsert settings
      const upserted = [];
      
      for (const [key, value] of Object.entries(payload)) {
        try {
          const row = await prisma.pluginSetting.upsert({
            where: { pluginId_key: { pluginId, key } },
            create: { pluginId, key, value },
            update: { value }
          });
          
          upserted.push({ key: row.key, value: row.value });
        } catch (err) {
          logger.error(`Failed to upsert setting ${pluginId}:${key}:`, err.message);
        }
      }

      // Audit log
      try {
        if (prisma.auditLog) {
          await prisma.auditLog.create({
            data: {
              source: "plugin",
              action: "plugin.config.update",
              actor: "system",
              level: "INFO",
              meta: { pluginId, keys: Object.keys(payload) }
            }
          });
        }
      } catch (e) {
        logger.warn("Config audit log failed:", e.message);
      }

      return res.json({ ok: true, upserted });
    } catch (err) {
      logger.error("POST /api/plugins/:pluginId/config error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST test/run plugin action
   */
  router.post("/:pluginId/test-action", validatePluginId, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const { actionName, meta: actionMeta = {} } = req.body || {};

      if (!actionName) {
        return res.status(400).json({
          ok: false,
          error: "action_name_required"
        });
      }

      const action = registry.getAction ? registry.getAction(pluginId, actionName) : null;
      
      if (!action) {
        return res.status(404).json({ ok: false, error: "action_not_found" });
      }

      // Try to run via engine
      if (app?.locals?.pluginEngine?.runAction) {
        try {
          // Add timeout
          const timeoutMs = 30000;
          const execution = app.locals.pluginEngine.runAction(
            pluginId,
            actionName,
            actionMeta
          );
          
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Action timeout")), timeoutMs)
          );

          const result = await Promise.race([execution, timeout]);
          
          return res.json({ ok: true, result });
        } catch (execErr) {
          logger.error("Action execution failed:", execErr);
          return res.status(500).json({
            ok: false,
            error: execErr.message
          });
        }
      }

      return res.status(500).json({
        ok: false,
        error: "plugin_engine_unavailable"
      });
    } catch (err) {
      logger.error("POST /api/plugins/:pluginId/test-action error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};