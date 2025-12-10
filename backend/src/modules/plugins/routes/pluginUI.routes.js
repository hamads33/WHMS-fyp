// src/modules/plugins/routes/pluginUI.routes.js
// Robust + Express-safe UI static loader for plugin UIs.
// - Supports "/plugins/ui/:pluginId/frame"
// - Supports "/plugins/ui/:pluginId/<asset>"
// - Uses a REGEX route instead of invalid wildcard (*?)
// - Includes your fallback logic exactly as before.

const express = require("express");
const path = require("path");
const fs = require("fs");

module.exports = function pluginUIRoutes({ logger = console } = {}) {
  const router = express.Router();

  function cspSandbox(req, res, next) {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'none'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "connect-src 'self' http: https:",
        "frame-ancestors 'none'",
        "sandbox allow-scripts allow-forms allow-same-origin allow-modals"
      ].join("; ")
    );
    next();
  }

  function getPluginUIRoot(pluginId) {
    return path.join(process.cwd(), "plugins", "actions", pluginId, "ui");
  }

  // ------------------------------
  // 1) FRAME ENDPOINT
  // ------------------------------
  router.get("/:pluginId/frame", cspSandbox, (req, res) => {
    const pluginId = req.params.pluginId;
    const uiRoot = getPluginUIRoot(pluginId);

    const candidates = [
      "iframe.html",
      "index.html",
      "settings.html"
    ].map(f => path.join(uiRoot, f));

    for (const file of candidates) {
      if (fs.existsSync(file)) {
        return res.sendFile(file);
      }
    }

    logger.error(`Plugin UI frame not found for: ${pluginId}`);
    return res.status(404).send("UI frame not found");
  });

  // --------------------------------------------------------------------
  // 2) STATIC UI ASSETS (SAFE REGEX — replaces BROKEN "/:pluginId/*?")
  // --------------------------------------------------------------------
  //
  // Matches:
  //    /plugins/ui/<pluginId>/<path>
  // Example:
  //    /plugins/ui/react_dashboard/app.js
  //
  router.get(/^\/([^\/]+)\/(.+)$/, cspSandbox, (req, res) => {
    const pluginId = req.params[0];
    let reqPath = req.params[1];

    const uiRoot = getPluginUIRoot(pluginId);

    const candidates = [];

    // 1) ui/<file>
    candidates.push(path.join(uiRoot, reqPath));

    // 2) ui/<file>.html when extension missing
    if (!path.extname(reqPath)) {
      candidates.push(path.join(uiRoot, reqPath + ".html"));
    }

    // 3) fallback to plugin root
    const pluginRoot = path.join(process.cwd(), "plugins", "actions", pluginId);
    candidates.push(path.join(pluginRoot, reqPath));

    if (!path.extname(reqPath)) {
      candidates.push(path.join(pluginRoot, reqPath + ".html"));
    }

    for (const filePath of candidates) {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
      }
    }

    logger.warn(`Plugin UI file not found: plugin=${pluginId}, reqPath=${reqPath}`);
    return res.status(404).send("UI file not found");
  });

  return router;
};
