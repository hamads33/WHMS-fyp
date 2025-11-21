// src/modules/plugins/routes/pluginUI.routes.js
const express = require("express");
const path = require("path");
const fs = require("fs");

module.exports = function pluginUIRoutes({ logger }) {
  const router = express.Router();

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

  function getPluginUIRoot(pluginId) {
    return path.join(process.cwd(), "plugins", "actions", pluginId, "ui");
  }

  // iframe view
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

  // ⭐ FIXED: static asset loader (regex)
  router.get(/^\/([^\/]+)\/(.*)$/, cspSandbox, (req, res) => {
    const pluginId = req.params[0];
    const reqPath  = req.params[1];

    const uiRoot = getPluginUIRoot(pluginId);
    const filePath = path.join(uiRoot, reqPath || "index.html");

    if (!fs.existsSync(filePath)) {
      logger.warn(`UI asset not found: ${filePath}`);
      return res.status(404).send("UI file not found");
    }

    return res.sendFile(filePath);
  });

  return router;
};
