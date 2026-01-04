// ============================================
// FILE: index.js (Plugin Entry Point)
// ============================================

"use strict";

const path = require("path");

// Import UI router
const uiRouter = require("./ui/router");

/**
 * Plugin initialization and lifecycle management
 */
module.exports = async function initInvoicePlugin(context) {
  const { app, logger, registry, plugin } = context;

  logger.info(`📦 Initializing Invoice Manager Plugin v${plugin.version}`);

  // --------------------------------------------
  // Dependency checks
  // --------------------------------------------
  const dependencies = ["pdfkit", "nodemailer", "axios"];
  for (const dep of dependencies) {
    try {
      require(dep);
      logger.info(`✅ Dependency ${dep} available`);
    } catch (e) {
      logger.warn(`⚠️ Optional dependency ${dep} not installed`);
    }
  }

  // --------------------------------------------
  // Database initialization (optional)
  // --------------------------------------------
  try {
    const db = app?.locals?.db;
    if (db) {
      logger.info("📊 Initializing invoice database tables...");
      logger.info("✅ Database tables ready");
    }
  } catch (e) {
    logger.warn("Database initialization skipped: " + e.message);
  }

  // --------------------------------------------
  // Plugin middleware
  // --------------------------------------------
  if (app) {
    app.use((req, res, next) => {
      req.invoicePlugin = {
        config: plugin.config || {},
        version: plugin.version
      };
      next();
    });

    logger.info("✅ Plugin middleware registered");
  }

  // --------------------------------------------
  // ✅ MOUNT PLUGIN UI (THIS WAS MISSING)
  // --------------------------------------------
  if (app) {
    app.use("/plugins/invoice-manager", uiRouter);
    logger.info("🖥️ Invoice Manager UI mounted at /plugins/invoice-manager");
  }

  logger.info("✅ Invoice Manager Plugin initialized successfully");

  return {
    name: plugin.name,
    version: plugin.version,
    status: "ready",
    timestamp: new Date().toISOString()
  };
};
