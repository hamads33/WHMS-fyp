// src/modules/plugins/routes/pluginUI.routes.js
const express = require("express");
const path = require("path");
const fs = require("fs");

module.exports = function pluginUIRoutes({ logger }) {
  const router = express.Router();

  /**
   * Apply strong CSP sandbox for plugin UI
   */
  function cspSandbox(req, res, next) {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'none'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "sandbox allow-scripts allow-forms allow-same-origin allow-modals"
      ].join("; ")
    );
    next();
  }

  /**
   * Base UI folder for all plugins
   * Example:
   * plugins/actions/<pluginId>/ui
   */
  function getPluginUIRoot(pluginId) {
    return path.join(process.cwd(), "plugins", "actions", pluginId, "ui");
  }

  /**
   * FRAME ROUTE
   * /plugins/ui/:pluginId/frame
   *
   * Loads iframe.html inside the plugin's UI folder
   */
  router.get("/:pluginId/frame", cspSandbox, (req, res) => {
    const pluginId = req.params.pluginId;
    const uiRoot = getPluginUIRoot(pluginId);
    const frameFile = path.join(uiRoot, "iframe.html");

    if (!fs.existsSync(frameFile)) {
      logger.error(`Plugin UI frame not found for: ${pluginId}`);
      return res.status(404).send("UI frame not found");
    }

    return res.sendFile(frameFile);
  });

  /**
   * SERVE ALL UI AS STATIC FILES
   * /plugins/ui/:pluginId/*
   *
   * Example:
   * /plugins/ui/complex_ui_plugin/main.js
   * /plugins/ui/complex_ui_plugin/assets/style.css
   */
  router.get("/:pluginId/*", cspSandbox, (req, res) => {
    const pluginId = req.params.pluginId;
    const reqPath = req.params[0]; // anything after pluginId/
    const uiRoot = getPluginUIRoot(pluginId);

    const filePath = path.join(uiRoot, reqPath);

    if (!fs.existsSync(filePath)) {
      logger.warn(`UI asset not found: ${filePath}`);
      return res.status(404).send("UI file not found");
    }

    return res.sendFile(filePath);
  });

  return router;
};
