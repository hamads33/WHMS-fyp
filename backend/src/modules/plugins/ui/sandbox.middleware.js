// src/modules/plugins/ui/sandbox.middleware.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

function makeNonce() {
  return crypto.randomBytes(16).toString("base64");
}

function cspHeaderForPlugin(nonce, connectSrc = []) {
  const connect = connectSrc.length ? connectSrc.join(" ") : "'none'";
  return [
    `default-src 'none'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src ${connect}`,
    `frame-ancestors 'none'`,
    `base-uri 'none'`
  ].join("; ");
}

module.exports = function createUiSandboxRouter({ pluginsBaseDir = path.join(process.cwd(), "plugins", "actions"), getAllowedConnectHosts = () => [] } = {}) {
  const router = express.Router();

  router.use("/static/:pluginId", (req, res, next) => {
    const pluginId = req.params.pluginId;
    const staticPath = path.join(pluginsBaseDir, pluginId, "ui");
    if (!fs.existsSync(staticPath)) return res.status(404).send("Plugin UI not found");

    const nonce = "static";
    const connectHosts = getAllowedConnectHosts(pluginId) || [];
    res.setHeader("Content-Security-Policy", cspHeaderForPlugin(nonce, connectHosts));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");

    const staticHandler = express.static(staticPath, { index: "index.html", extensions: ["html", "js", "css"] });
    return staticHandler(req, res, next);
  });

  router.get("/ui/:pluginId/frame", (req, res) => {
    const pluginId = req.params.pluginId;
    const uiIndex = path.join(pluginsBaseDir, pluginId, "ui", "index.html");
    if (!fs.existsSync(uiIndex)) return res.status(404).send("Plugin UI not found");

    const nonce = makeNonce();
    const wrapperCSP = [
      `default-src 'none'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data:`,
      `frame-src 'self'`,
      `connect-src 'self'`
    ].join("; ");

    res.setHeader("Content-Security-Policy", wrapperCSP);
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const iframeSrc = `/plugins/static/${encodeURIComponent(pluginId)}/index.html`;

    const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Plugin UI - ${pluginId}</title></head>
<body style="margin:0">
  <iframe src="${iframeSrc}" sandbox="allow-scripts allow-same-origin" style="width:100%;height:100vh;border:0;"></iframe>
  <script nonce="${nonce}">
    // Optional postMessage bridge - implement carefully if you need host<->plugin messaging.
  </script>
</body>
</html>`;
    res.type("html").send(html);
  });

  return router;
};
