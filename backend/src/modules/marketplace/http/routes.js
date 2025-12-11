// src/modules/marketplace/http/routes.js
const express = require("express");
const path = require("path");
const os = require("os");
const multer = require("multer");
const uploadController = require("./controllers/upload.controller");

module.exports = function marketplaceRoutes({ logger = console, prisma, registry } = {}) {
  if (!prisma) throw new Error("marketplaceRoutes requires { prisma }");

  const router = express.Router();

  // tmp uploads for extraction
  const uploadsTmp = path.join(os.tmpdir(), "marketplace-uploads");
  const storageDest = path.join(process.cwd(), "uploads", "marketplace"); // chosen path for final storage

  // multer will place uploaded zip in tmp dir (200MB cap)
  const upload = multer({ dest: uploadsTmp, limits: { fileSize: 200 * 1024 * 1024 } });

  // POST /api/marketplace/products/:productId/upload-version
  router.post(
    "/products/:productId/upload-version",
    upload.single("file"),
    (req, res, next) => {
      // pass context to controller
      req.ctx = { prisma, logger, uploadsTmp, storageDest };
      next();
    },
    uploadController.uploadVersion
  );

  return router;
};
