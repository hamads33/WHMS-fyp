require("dotenv").config();

const express = require("express");
const cors = require("cors");
const ip = require("ip");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const swaggerSpec = require("./docs/swagger.config");

const app = express();
const prisma = new PrismaClient();
app.set("trust proxy", true);
// 🔧 FIX: Allow JSON.stringify(BigInt)
BigInt.prototype.toJSON = function () {
  return this.toString();
};
app.use((req, res, next) => {
  console.log("➡ Request reached server");
  next();
});
/* ================================================================
   GLOBAL MIDDLEWARES
   – JSON body limit
   – Cookies
   – Debug incoming origin
================================================================ */
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Debugging request origins (useful when testing CORS issues)
app.use((req, res, next) => {
  console.log("🌐 Incoming Origin:", req.headers.origin);
  next();
});

// Normalize IPv4-mapped IPv6 addresses (::ffff:x.x.x.x → x.x.x.x)
// Overrides req.ip so all downstream code gets a clean IPv4 string automatically
app.use((req, res, next) => {
  const raw = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || req.ip || "";
  const normalized = raw.startsWith("::ffff:") ? raw.slice(7) : (raw === "::1" ? "127.0.0.1" : raw) || null;
  Object.defineProperty(req, "ip", { get: () => normalized, configurable: true });
  next();
});
const adminPortalGuard = require("./modules/auth/guards/adminPortal.guard");

const authGuard = require("./modules/auth/middlewares/auth.guard");
/* ================================================================
   RESPONSE HELPER MIDDLEWARE (CRITICAL - ADD EARLY)
   – Provides res.success(), res.fail(), res.error()
   – Must be before all route handlers
================================================================ */
app.use((req, res, next) => {
  res.success = (data, message = "Success", statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      data,
      message,
    });
  };

  res.fail = (message, statusCode = 400, errorCode = "error") => {
    res.status(statusCode).json({
      success: false,
      message,
      error: errorCode,
    });
  };

  res.error = (message, statusCode = 500) => {
    const errorMsg = typeof message === "string" ? message : message?.message || "Internal Server Error";
    res.status(statusCode).json({
      success: false,
      error: errorMsg,
      message: "An error occurred",
    });
  };

  next();
});

/* ================================================================
   AUTHENTICATION MIDDLEWARE (GLOBAL)
   – Protects all routes by default
================================================================ */
// const authenticateToken = require("./modules/auth/middlewares/auth.guard");
// app.use(authenticateToken);

/* ================================================================
   CORS CONFIG (CLEAN + PATCHED)
   – Supports multiple allowed origins
   – Allows local network variants
   – Allows tools/cURL with no origin
================================================================ */
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:3000";

let allowedOrigins = FRONTEND_ORIGIN.split(",")
  .map(o => o.trim())
  .filter(Boolean);

// Local dev fallbacks
allowedOrigins.push("http://127.0.0.1:3000");
allowedOrigins.push(`http://${ip.address()}:3000`);
allowedOrigins.push("http://localhost:3000");
// Frontend on port 3002
allowedOrigins.push("http://localhost:3002");
allowedOrigins.push("http://127.0.0.1:3002");
allowedOrigins.push(`http://${ip.address()}:3002`);
// Billing demo page
allowedOrigins.push("http://localhost:3333");
allowedOrigins.push("http://127.0.0.1:3333");
allowedOrigins.push("http://localhost:5555");
allowedOrigins.push("http://127.0.0.1:5555");
// HostHub (third-party site integration)
allowedOrigins.push("http://localhost:3001");
allowedOrigins.push("http://127.0.0.1:3001");

console.log("✅ Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, server-side)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        console.log("✔ CORS Allowed:", origin);
        return callback(null, true);
      }

      console.log("✖ CORS Blocked:", origin);
      return callback(null, false);
    },

    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-client-token"],
  })
);

console.log("Google Client ID:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
const { registerBackupAuditHooks } = require("./modules/backup/bootstrap");
// ======================= AUDIT MODULE =======================
const { initAuditModule } = require("./modules/audit");
const logger = console;

initAuditModule({
  app,
  prisma,
  logger,
});
registerBackupAuditHooks({
  auditLogger: app.locals.auditLogger,
});

/////////////////////////////////////////////////////////////////////
/* ===============================================AUDIT=================  
   AUDIT CONTEXT MIDDLEWARE (NEW + REQUIRED)
   – Extracts IP, userAgent, userId from request
   – Makes automation logs fully traceable
================================================================ */
const auditContext = require("./modules/automation/middleware/auditContext");
app.use(auditContext());

// (Do NOT uncomment impersonation middleware yet)
// const impersonationMiddleware = require("./modules/auth/middlewares/impersonation.middleware");
// app.use(impersonationMiddleware);

const path = require("path");

/* ================================================================
   AUTH MODULE ROUTES
================================================================ */
app.use("/api/auth", require("./modules/auth/routes/auth.routes"));
app.use("/api/auth/sessions", require("./modules/auth/routes/session.routes"));
app.use("/api/auth/email", require("./modules/auth/routes/email.routes"));
app.use("/api/auth/password", require("./modules/auth/routes/password.routes"));
app.use("/api/auth/mfa", require("./modules/auth/routes/mfa.routes"));
app.use("/api/auth/trusted-devices", require("./modules/auth/routes/trustedDevice.routes"));
app.use("/api/auth/apikeys", require("./modules/auth/routes/apiKey.routes"));
app.use("/api/auth/impersonate", require("./modules/auth/routes/impersonation.routes"));

app.use("/api/admin/impersonation", authGuard, adminPortalGuard, require("./modules/auth/routes/impersonationLogs.routes"));
app.use("/api/admin/users",         authGuard, adminPortalGuard, require("./modules/auth/routes/adminUsers.routes"));
app.use("/api/admin/roles",         authGuard, adminPortalGuard, require("./modules/auth/routes/roles.routes"));
app.use("/api/admin/rbac",          authGuard, adminPortalGuard, require("./modules/auth/routes/rbacAdmin.routes"));
const ipRulesRoutes = require("./modules/auth/routes/ipRules.routes");
app.use("/api/ip-rules", ipRulesRoutes);

/* ================================================================
   OTHER MODULE ROUTES
================================================================ */
app.use("/api/admin/dashboard", authGuard, adminPortalGuard, require("./modules/dashboard/dashboard.routes"));
app.use("/api/admin/clients", authGuard, adminPortalGuard, require("./modules/clients/clients.routes"));

// ✅ DOMAIN MODULE ROUTES (ALL DOMAINS - USER & ADMIN)
// This is the FIX for: Cannot GET /api/admin/domains/stats error
// We need to import both user routes and admin routes separately
// and mount them at the correct endpoints
const domainRoutes = require("./modules/domains/index");
app.use("/api", domainRoutes);

/////services
app.use("/api/admin", authGuard, adminPortalGuard, require("./modules/services").adminRoutes);
app.use("/api/client", require("./modules/services").clientRoutes);

/// orders (FIXED & CONSISTENT)
const ordersModule = require("./modules/orders");

app.use("/api/client/orders", ordersModule.clientRoutes);
app.use("/api/admin/orders", authGuard, adminPortalGuard, ordersModule.adminRoutes);
/////billing////
const billing = require('./modules/billing');
app.use("/api/admin/billing", authGuard, adminPortalGuard, billing.adminRoutes);
app.use('/api/client/billing', billing.clientRoutes);

// Start billing cron jobs (renewal processing, overdue detection)
const { scheduleBillingJobs } = require('./modules/billing/jobs/billing.cron');
scheduleBillingJobs();

// Client profile endpoints
app.use('/api/client/profile', require('./modules/clients/client-portal.routes'));

/* ================================================================
   BROADCAST MODULE (DOCUMENTS & NOTIFICATIONS)
================================================================ */
const broadcastModule = require('./modules/broadcast');
app.use("/api/admin/broadcasts", authGuard, adminPortalGuard, broadcastModule.admin);
app.use("/api/client/broadcasts", authGuard, broadcastModule.client);

/* ================================================================
   SERVER MANAGEMENT MODULE
================================================================ */
app.use("/api/admin/server-management", authGuard, adminPortalGuard, require("./modules/server-management"));

/* ================================================================
   ADMIN SYSTEM SETTINGS (storage paths, etc.)
================================================================ */
app.use("/api/admin", authGuard, adminPortalGuard, require("./modules/settings/settings.routes"));

/* ================================================================
   PUBLIC EMBEDDABLE API  —  /public/v1/
================================================================ */
app.use("/public/v1", require("./modules/public/public.routes"));
// Hosted storefront — no API key required
app.use("/api/store",  require("./modules/public/store.routes"));

/* ================================================================
   BACKUP MODULE (AUTO-LOADS PROVIDERS + ROUTES)
================================================================ */
const backupApi = require("./modules/backup/api");
app.use("/api", backupApi);

////////email///
const emailRoutes = require("./modules/email/email.routes");
// Public send API
app.use("/api/v1/email", emailRoutes);
// Admin-protected email routes (templates, logs, settings)
app.use("/api/admin/email", authGuard, adminPortalGuard, emailRoutes);

///////////////
/* ================================================================
   PLUGIN MARKETPLACE MODULE
================================================================ */
const buildMarketplaceRouter = require("./modules/plugin-marketplace/plugin-marketplace.routes");
app.use("/api", buildMarketplaceRouter({ app, prisma, logger: console }));

// Serve plugin assets (icons, screenshots, etc.)
const assetPath = require("path").join(process.cwd(), "storage", "plugin-assets");
app.use("/uploads/plugin-assets", express.static(assetPath));

/* ================================================================
   INSTALLED PLUGINS API
================================================================ */
const pluginStateService = require("./core/plugin-system/plugin-state.service");

app.get("/api/admin/installed-plugins", authGuard, adminPortalGuard, (_req, res) => {
  const pm = app.locals.pluginManager;
  if (!pm) return res.json({ success: true, data: [] });

  const plugins = pm.list().map(p => ({
    ...p,
    enabled : pluginStateService.isEnabled(p.name),
    state   : pluginStateService.isEnabled(p.name) ? "enabled" : "disabled",
  }));

  res.json({ success: true, count: plugins.length, data: plugins });
});

app.post("/api/admin/installed-plugins/:name/enable", authGuard, adminPortalGuard, (req, res) => {
  const pm = app.locals.pluginManager;
  if (!pm) return res.status(503).json({ success: false, message: "Plugin system not ready" });
  const result = pm.enablePlugin(req.params.name);
  res.json({ success: result.ok, message: result.message || `Plugin ${req.params.name} enabled` });
});

app.post("/api/admin/installed-plugins/:name/disable", authGuard, adminPortalGuard, (req, res) => {
  const pm = app.locals.pluginManager;
  if (!pm) return res.status(503).json({ success: false, message: "Plugin system not ready" });
  const result = pm.disablePlugin(req.params.name);
  res.json({ success: result.ok, message: result.message || `Plugin ${req.params.name} disabled` });
});

/* ================================================================
   PLUGIN UI MANIFEST
   – Returns nav entries contributed by enabled plugins with ui capability
================================================================ */
app.get("/api/admin/plugin-ui-manifest", authGuard, adminPortalGuard, (_req, res) => {
  const pm = app.locals.pluginManager;
  if (!pm) return res.json({ success: true, data: [] });
  res.json({ success: true, data: pm.getPluginUiManifest() });
});

/* ================================================================
   OPENAPI SPEC ENDPOINT
================================================================ */
app.get("/api/openapi.json", (_req, res) => res.json(swaggerSpec));

/* ================================================================
   HEALTH CHECK
================================================================ */
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "WHMS backend is running" });
});

/* ================================================================
   HELPER: Run async operation with timeout
   – Prevents hangs from long-running operations
   – Returns null if timeout occurs
================================================================ */
async function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`⏱️ ${label} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]).catch(err => {
    console.error(`❌ ${label} failed:`, err.message);
    return null;
  });
}

/* ================================================================
   INIT FUNCTION (IMPROVED)
   – Non-blocking: Server starts even if modules fail
   – Timeouts: Each module has a timeout to prevent hanging
   – Better logging: Shows exactly where it's stuck
   – Graceful degradation: Logs errors but continues
================================================================ */
async function init() {
  console.log("🚀 Initializing core modules...");
  const startTime = Date.now();

  /* ✅ 1. RBAC SEED (Required for auth, usually fast) */
  console.log("📋 Step 1/6: Seeding RBAC...");
  try {
    await withTimeout(
      (async () => {
        const { seedRBAC } = require("./modules/auth/seed/rbac-seed");
        await seedRBAC(prisma);
      })(),
      10000,
      "RBAC seed"
    );
    console.log("✅ RBAC seeded successfully!");
  } catch (err) {
    console.error("❌ RBAC seed error:", err.message);
  }

  /* ✅ 1b. EMAIL SEED (Templates + default settings) */
  try {
    await withTimeout(
      (async () => {
        const { seedEmail } = require("./modules/email/seed/email.seed");
        await seedEmail(prisma);
      })(),
      15000,
      "Email seed"
    );
  } catch (err) {
    console.error("❌ Email seed error:", err.message);
  }

  /* ✅ 1b-ii. SEED SMTP SETTINGS from env → DB (idempotent, never overwrites) */
  try {
    const { seedEnvSettings } = require("./modules/email/emailProvider");
    await seedEnvSettings();
  } catch (err) {
    console.error("❌ Email settings seed error:", err.message);
  }

  /* ✅ 1c. EMAIL WORKER (background) */
  try {
    require("./worker/emailWorker");
    console.log("✅ Email worker started");
  } catch (err) {
    console.error("❌ Email worker error:", err.message);
  }

  /* ✅ 1d. EXPOSE emailTriggers on app.locals for other modules */
  app.locals.emailTriggers = require("./modules/email/triggers/email.triggers");

  /* ✅ 2. PLUGIN SYSTEM */
  console.log("📋 Step 2/5: Initializing Plugin System...");
  const automationLogger = require("./modules/automation/lib/logger");
  const PluginManager = require("./core/plugin-system/plugin.manager");

  const pluginManager = new PluginManager({ app, prisma, logger: console });

  try {
    await withTimeout(
      pluginManager.init(),
      15000,
      "Plugin system initialization"
    );
    app.locals.pluginManager = pluginManager;
    console.log(`✅ Plugin system initialized (${pluginManager.list().length} plugin(s))`);
  } catch (err) {
    console.error("❌ Plugin system error:", err.message);
    console.warn("⚠️ Continuing without plugins");
  }

  /* ✅ 3. AUTOMATION MODULE INITIALIZATION */
  console.log("📋 Step 4/5: Initializing Automation...");
  try {
    const initAutomationModule = require("./modules/automation");

    const automation = await withTimeout(
      initAutomationModule({
        app,
        prismaClient: prisma,
        logger: automationLogger,
        config: {},
      }),
      15000, // 15 second timeout
      "Automation module initialization"
    );

    if (automation && automation.scheduler) {
      app.locals.scheduler = automation.scheduler;
      console.log("✅ Automation module initialized successfully");
    } else {
      console.warn("⚠️ Automation initialization incomplete - some features may not work");
    }
  } catch (err) {
    console.error("❌ Automation module error:", err.message);
    console.log("⚠️ Continuing without automation functionality...");
  }

  /* ✅ 5. START BACKGROUND WORKER (Non-blocking) */
  console.log("📋 Step 5/6: Starting Background Worker...");
  try {
    const startWorker = require("./modules/automation/worker/worker");

    // Start worker in background (don't wait for it)
    startWorker({
      app,
      prisma,
      logger: automationLogger,
      concurrency: 5,
      queueName: "automation",
    }).then(() => {
      console.log("✅ Worker started successfully");
    }).catch(err => {
      console.error("❌ Worker failed to start:", err.message);
    });

    // Don't wait - let it start in background
    console.log("⏳ Worker starting in background...");
  } catch (err) {
    console.error("❌ Worker initialization error:", err.message);
  }

  /* ✅ 6. START BACKUP WORKERS (Non-blocking) */
  console.log("📋 Step 6/6: Starting Backup Workers...");
  try {
    require("./modules/backup/worker/runner");
    require("./modules/backup/worker/restoreQueue");
    require("./modules/backup/worker/retentionQueue");
    console.log("✅ Backup workers started (backup, restore, retention)");
  } catch (err) {
    console.error("❌ Backup worker initialization error:", err.message);
    console.warn("⚠️ Continuing without backup worker functionality...");
  }

  const elapsed = Date.now() - startTime;
  console.log(`\n✅ Initialization complete in ${elapsed}ms`);
  console.log("🚀 Server ready to accept requests!\n");
}

/* ================================================================
   GLOBAL ERROR HANDLER
   – Captures any unhandled backend errors
================================================================ */
app.use((err, req, res, next) => {
  console.error("💥 Backend Error:", err);
  res.status(err.statusCode || 500).json({ error: err.message || "Internal Server Error" });
});

/* ================================================================
   START INITIALIZATION (Non-blocking)
   – Calls init() but doesn't block server startup
   – Server starts immediately and listens for requests
   – Modules initialize in the background
================================================================ */
init()
  .then(() => console.log("✅ All modules initialized."))
  .catch(err => console.error("❌ Critical init error:", err.message));

/* ================================================================
   EXPORT APP (NOT INIT)
================================================================ */
module.exports = app;