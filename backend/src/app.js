require("dotenv").config();

const express = require("express");
const cors = require("cors");
const ip = require("ip");
const cookieParser = require("cookie-parser");

const app = express();

/* ================================================================
   GLOBAL MIDDLEWARES
================================================================ */
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Debug request origin
app.use((req, res, next) => {
  console.log("🌐 Incoming Origin:", req.headers.origin);
  next();
});

/* ================================================================
   CORS CONFIG (CLEAN + FIXED)
================================================================ */
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:3000";

let allowedOrigins = FRONTEND_ORIGIN.split(",")
  .map(o => o.trim())
  .filter(Boolean);

// Local dev variants
allowedOrigins.push("http://127.0.0.1:3000");
allowedOrigins.push(`http://${ip.address()}:3000`);
allowedOrigins.push("http://localhost:3000");

console.log("✅ Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow mobile apps, curl, etc.

      if (allowedOrigins.includes(origin)) {
        console.log("✔ CORS Allowed:", origin);
        return callback(null, true);
      }

      console.log("❌ CORS Blocked:", origin);
      return callback(null, false);
    },

    credentials: true,

    // IMPORTANT — PATCH MUST BE HERE
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// No need for app.options("*") — cors() handles OPTIONS automatically

console.log("Google Client ID:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

/* ================================================================
   IMPERSONATION MIDDLEWARE
================================================================ */
// const impersonationMiddleware = require("./modules/auth/middlewares/impersonation.middleware");
// app.use(impersonationMiddleware); //will add this later

/* ================================================================
   AUTH MODULE ROUTES
================================================================ */
app.use("/api/auth", require("./modules/auth/routes/auth.routes"));
app.use("/api/auth/email", require("./modules/auth/routes/email.routes"));
app.use("/api/auth/password", require("./modules/auth/routes/password.routes"));
app.use("/api/auth/mfa", require("./modules/auth/routes/mfa.routes"));
app.use("/api/auth/trusted-devices", require("./modules/auth/routes/trustedDevice.routes"));
app.use("/api/auth/apikeys", require("./modules/auth/routes/apiKey.routes"));
app.use("/api/auth/impersonate", require("./modules/auth/routes/impersonation.routes"));

app.use("/api/admin/impersonation", require("./modules/auth/routes/impersonationLogs.routes"));

// in src/server.js after your other auth route registrations
app.use("/api/admin/users", require("./modules/auth/routes/adminUsers.routes"));

// IP Rules
const ipRulesRoutes = require("./modules/auth/routes/ipRules.routes");
app.use("/api/ip-rules", ipRulesRoutes);

/* ================================================================
   OTHER APIs
================================================================ */
app.use("/api/v1/clients", require("./modules/clients/clients.routes"));
app.use("/api/domains", require("./modules/domains"));

/* ================================================================
   BACKUP MODULE
================================================================ */
const backupModule = require("./modules/backup/backup.module");
app.use("/api/backups", require("./modules/backup/routes/backup.routes"));
backupModule.init();

/* ================================================================
   MARKETPLACE (DISABLED FOR NOW)
================================================================ */
// const dummyAuth = require("./modules/marketplace/middleware/dummyAuth");
// app.use("/marketplace", dummyAuth);
// app.use("/marketplace", require("./modules/marketplace/routes"));

/* ================================================================
   HEALTH CHECK
================================================================ */
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "WHMS backend is running" });
});

/* ================================================================
   INIT FUNCTION — PLUGINS, AUTOMATION, RBAC
================================================================ */
async function init() {
  console.log("🚀 Initializing core modules...");

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  // RBAC
  const { seedRBAC } = require("./modules/auth/seed/rbac-seed");
  await seedRBAC(prisma);
  console.log("🔐 RBAC seeded successfully!");

  // PLUGINS
  const automationLogger = require("./modules/automation/lib/logger");
  const initPluginModule = require("./modules/plugins");

  await initPluginModule({
    app,
    prisma,
    logger: automationLogger,
    ajv: new (require("ajv"))(),
    publicKeyPem: null,
  });

  // AUTOMATION
  const initAutomationModule = require("./modules/automation");
  const automation = await initAutomationModule({
    app,
    prismaClient: prisma,
    logger: automationLogger,
    config: {},
  });

  app.locals.scheduler = automation.scheduler;

  console.log("⚙️ Automation module initialized successfully");
}

/* ================================================================
   GLOBAL ERROR HANDLER
================================================================ */
app.use((err, req, res, next) => {
  console.error("🔥 Backend Error:", err.message);
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

/* ================================================================
   EXPORT
================================================================ */
module.exports = { app, init };
