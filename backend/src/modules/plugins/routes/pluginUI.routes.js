// src/modules/plugins/routes/pluginUI.routes.js
// Secure UI routes with path traversal protection

const express = require("express");
const path = require("path");
const fs = require("fs");

module.exports = function pluginUIRoutes({ logger = console } = {}) {
  const router = express.Router();

  const PLUGIN_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

  // --------------------------------------------------
  // CSP sandbox
  // --------------------------------------------------
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

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------
  function validatePluginId(pluginId) {
    return pluginId && PLUGIN_ID_REGEX.test(pluginId);
  }

  function getPluginRoot(pluginId) {
    return path.join(process.cwd(), "plugins", "actions", pluginId);
  }

  function getPluginUIRoot(pluginId) {
    return path.join(getPluginRoot(pluginId), "ui");
  }

  function sanitizePath(p) {
    if (!p) return "";
    return path
      .normalize(p)
      .replace(/^(\.\.(\/|\\|$))+/, "")
      .replace(/\.\./g, "")
      .replace(/[<>:"|?*]/g, "");
  }

  function isPathSafe(target, root) {
    return path.resolve(target).startsWith(path.resolve(root));
  }

  // --------------------------------------------------
  // Frame endpoint
  // --------------------------------------------------
  router.get("/:pluginId/frame", cspSandbox, (req, res) => {
    const { pluginId } = req.params;

    if (!validatePluginId(pluginId)) {
      return res.status(400).send("Invalid plugin ID");
    }

    const uiRoot = getPluginUIRoot(pluginId);

    if (!fs.existsSync(uiRoot)) {
      return res.status(404).send("Plugin UI not found");
    }

    for (const file of ["iframe.html", "index.html", "settings.html"]) {
      const filePath = path.join(uiRoot, file);
      if (isPathSafe(filePath, uiRoot) && fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }

    return res.status(404).send("UI frame not found");
  });

  // --------------------------------------------------
  // Static UI handler (NO wildcards)
  // --------------------------------------------------
  router.use("/:pluginId", cspSandbox, (req, res) => {
    const { pluginId } = req.params;

    if (!validatePluginId(pluginId)) {
      return res.status(400).send("Invalid plugin ID");
    }

    const relativePath = sanitizePath(req.path.replace(/^\/+/, ""));
    if (!relativePath) {
      return res.status(404).send("File not found");
    }

    const pluginRoot = getPluginRoot(pluginId);
    const uiRoot = getPluginUIRoot(pluginId);

    const candidates = [
      path.join(uiRoot, relativePath),
      path.join(uiRoot, `${relativePath}.html`),
      path.join(pluginRoot, relativePath),
      path.join(pluginRoot, `${relativePath}.html`)
    ];

    for (const filePath of candidates) {
      if (
        (isPathSafe(filePath, uiRoot) || isPathSafe(filePath, pluginRoot)) &&
        fs.existsSync(filePath) &&
        fs.statSync(filePath).isFile()
      ) {
        return res.sendFile(filePath);
      }
    }

    return res.status(404).send("UI file not found");
  });

  return router;
};
