// src/app.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const ip = require("ip");
const app = express();

/* IMPORT AUTOMATION MODULE HERE */
const automationModule = require("./modules/automation/automation.module");
/* IMPORT BACKUP MODULE */
const backupModule = require("./modules/backup/backup.module");

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

/* AUTOMATION ROUTES — ONLY ONE */
app.use("/api/automation", require("./modules/automation/routes"));

/* INIT AUTOMATION MODULE */
automationModule.init(); // no "app" needed

/* BACKUP ROUTES */
app.use("/api/backups", require("./modules/backup/routes/backup.routes"));
backupModule.init();   // starts bullmq worker

/* ---------------------- HEALTH CHECK ---------------------- */
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "WHMS backend is running" });
});

/* ---------------------- ERROR HANDLER ---------------------- */
app.use((err, req, res, next) => {
  console.error("🔥 Backend Error:", err.message);
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

module.exports = app;
