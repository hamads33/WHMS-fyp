// src/modules/plugins/routes/plugins.routes.js
const express = require("express");
const multer = require("multer");
const upload = multer({ dest: "uploads/plugins/tmp" });

const InstallerController = require("../controllers/installer.controller");
const registry = require("../pluginEngine/registry");
const SettingsController = require("../controllers/settings.controller");

module.exports = ({ logger, ajv, publicKeyPem, prisma }) => {
  const router = express.Router();

  const installer = new InstallerController({
    logger,
    ajv,
    publicKeyPem
  });

  const settingsCtrl = new SettingsController({ prisma });

  router.get("/list", (req, res) => {
    return res.json({ success: true, data: registry.list() });
  });

  router.post(
    "/install",
    upload.single("file"),
    (req, res, next) => installer.upload(req, res, next)
  );

  router.get("/settings/:pluginId", settingsCtrl.list.bind(settingsCtrl));
  router.post("/settings/:pluginId", express.json(), settingsCtrl.upsert.bind(settingsCtrl));

  return router;
};
