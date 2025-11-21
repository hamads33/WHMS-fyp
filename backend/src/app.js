// src/app.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const ip = require("ip");
const app = express();

// /* IMPORT AUTOMATION MODULE HERE */
const initAutomationModule = require("./modules/automation");   // ✅ Added
// const automationModule = require("./modules/automation/automation.module");
// /* IMPORT BACKUP MODULE */
const backupModule = require("./modules/backup/backup.module");
// const pluginRoutes = require('./modules/plugins/routes');
// const automationRoutes = require('./modules/automation/routes');
// const pluginLoader = require('./modules/plugins/pluginEngine/pluginLoader');
// const cronRunner = require('./modules/automation/workers/cron.runner');

// ✅ DO NOT REMOVE — NEW: Import plugin module ONLY (NOT pluginRoutes directly)
const initPluginModule = require("./modules/plugins");

/* ---------------------- DEBUG LOG ORIGIN ---------------------- */
app.use((req, res, next) => {
  console.log("🌐 Incoming Origin:", req.headers.origin);
  next();
});

/* ---------------------- CORS CONFIG ---------------------- */

const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:3000";

let allowedOrigins = FRONTEND_ORIGIN.split(",")
  .map(o => o.trim())
  .filter(Boolean);

allowedOrigins.push("http://127.0.0.1:3000");
allowedOrigins.push(`http://${ip.address()}:3000`);

console.log("✅ Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS Blocked:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

/* ---------------------- JSON MIDDLEWARE ---------------------- */
app.use(express.json());

console.log("Google Client ID:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

/* ---------------------- ROUTES ---------------------- */
app.use("/api/auth", require("./modules/auth/auth.routes"));
app.use("/api/v1/clients", require("./modules/clients/clients.routes"));
app.use("/api/domains", require("./modules/domains"));

// /* AUTOMATION ROUTES — ONLY ONE */
// app.use("/api/automation", require("./modules/automation/routes"));

// /* INIT AUTOMATION MODULE */
// automationModule.init(); // no "app" needed

// ❗ FIX: REMOVE TOP-LEVEL AWAIT — wrap in async init()
// async function init() {
//   await pluginLoader.loadAll();
//   await cronRunner.scheduleAll();
// }

// app.use('/api/v1', pluginRoutes);
// app.use('/api/v1', automationRoutes);

/* BACKUP ROUTES */
app.use("/api/backups", require("./modules/backup/routes/backup.routes"));
backupModule.init();   // starts bullmq worker

/* ---------------------- PLUGIN ROUTES (NEW, NO COMMENT REMOVED) ---------------------- */
// ❗ IMPORTANT: remove this line because plugin routes are mounted inside initPluginModule
// app.use("/api/plugins", pluginRoutes);

/* ---------------------- HEALTH CHECK ---------------------- */
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "WHMS backend is running" });
});

/* ---------------------- ERROR HANDLER ---------------------- */
app.use((err, req, res, next) => {
  console.error("🔥 Backend Error:", err.message);
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

/* ---------------------- INIT FUNCTION ---------------------- */
async function init() {
  console.log("🚀 Initializing core modules...");

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  // Logger for automation module
  const automationLogger = require("./modules/automation/lib/logger");

  /* ---------------------- INIT PLUGINS MODULE (NO COMMENTS REMOVED) ---------------------- */
  await initPluginModule({
    app,               // <-- REQUIRED (your error was because app was missing)
    prisma,
    logger: automationLogger,
   // plugin loader needs Ajv instance
ajv: new (require("ajv"))(),

publicKeyPem: null
     // add support later when signatures enabled
  });

  // ---------------------- INIT AUTOMATION MODULE ---------------------- //
  const automation = await initAutomationModule({
    app,
    prismaClient: prisma,
    logger: automationLogger,
    config: {}
  });

  // Make scheduler globally available if needed
  app.locals.scheduler = automation.scheduler;

  console.log("⚙️ Automation module initialized successfully");
}

module.exports = { app, init };
