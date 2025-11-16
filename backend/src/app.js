// src/app.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const ip = require("ip");     // for LAN support
const app = express();

/* ---------------------- DEBUG LOG ORIGIN ---------------------- */
app.use((req, res, next) => {
  console.log("🌐 Incoming Origin:", req.headers.origin);
  next();
});

/* ---------------------- CORS CONFIG ---------------------- */

// ENV: FRONTEND_URL can be:
// FRONTEND_URL=http://localhost:3000,http://192.168.100.11:3000
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:3000";

// Convert comma-separated list → array
let allowedOrigins = FRONTEND_ORIGIN.split(",")
  .map(o => o.trim())
  .filter(Boolean);

// Always allow these:
allowedOrigins.push("http://127.0.0.1:3000");
allowedOrigins.push(`http://${ip.address()}:3000`);  // LAN support

console.log("✅ Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman, server-side requests
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS Blocked:", origin);

      // Reject CORS properly, do NOT crash server
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

app.use("/api/automation", require("./modules/automation/automations.routes"));

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
