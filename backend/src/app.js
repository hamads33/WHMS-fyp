require("dotenv").config();

const express = require("express");
const cors = require("cors");
const ip = require("ip");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
app.set("trust proxy", false);
// 🔧 FIX: Allow JSON.stringify(BigInt)
BigInt.prototype.toJSON = function () {
  return this.toString();
};

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

console.log("✅ Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, server-side)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        console.log("✓ CORS Allowed:", origin);
        return callback(null, true);
      }

      console.log("✗ CORS Blocked:", origin);
      return callback(null, false);
    },

    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

console.log("Google Client ID:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

/* ================================================================
   AUDIT CONTEXT MIDDLEWARE (NEW + REQUIRED)
   – Extracts IP, userAgent, userId from request
   – Makes automation logs fully traceable
================================================================ */
const auditContext = require("./modules/automation/middleware/auditContext");
app.use(auditContext());

// (Do NOT uncomment impersonation middleware yet)
// const impersonationMiddleware = require("./modules/auth/middlewares/impersonation.middleware");
// app.use(impersonationMiddleware);

/* ================================================================
   STATIC SDK FOR PLUGIN UIs (REQUIRED)
   – Lets frontend plugins load plugin-sdk.js
================================================================ */
const path = require("path");

// Serves: http://localhost:4000/plugins/sdk/plugin-sdk.js
app.use(
  "/plugins/sdk",
  express.static(path.join(process.cwd(), "public", "plugins"))
);

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

app.use("/api/admin/impersonation", require("./modules/auth/routes/impersonationLogs.routes"));
app.use("/api/admin/users", require("./modules/auth/routes/adminUsers.routes"));
app.use("/api/admin/roles", require("./modules/auth/routes/roles.routes"));
const ipRulesRoutes = require("./modules/auth/routes/ipRules.routes");
app.use("/api/ip-rules", ipRulesRoutes);

/* ================================================================
   OTHER MODULE ROUTES
================================================================ */
app.use("/api/v1/clients", require("./modules/clients/clients.routes"));

// ✅ DOMAIN MODULE ROUTES (ALL DOMAINS - USER & ADMIN)
// This is the FIX for: Cannot GET /api/admin/domains/stats error
// We need to import both user routes and admin routes separately
// and mount them at the correct endpoints
const domainRoutes = require("./modules/domains/index");
app.use("/api", domainRoutes);



/////services
app.use("/api/admin", require("./modules/services").adminRoutes);
app.use("/api/client", require("./modules/services").clientRoutes);
/// orders (FIXED & CONSISTENT)
const ordersModule = require("./modules/orders");

app.use("/api/client/orders", ordersModule.clientRoutes);
app.use("/api/admin/orders", ordersModule.adminRoutes);



/* ================================================================
   BACKUP MODULE (AUTO-LOADS PROVIDERS + ROUTES)
================================================================ */
const backupApi = require("./modules/backup/api");
app.use("/api", backupApi);
////////email///
// ADD your routes AFTER app is loaded (optional)
const emailRoutes = require("./modules/email/email.routes");
app.use("/api/v1/email", emailRoutes);


///////////////
/* ================================================================
   MARKETPLACE MODULE
   – FIXED: Properly initialize marketplace with async setup
   – Returns router function that must be called to get middleware
================================================================ */
// NOTE: Marketplace initialization is deferred to init() function
// This ensures pluginEngine is available before marketplace is initialized
// See init() function below for marketplace async setup


/* ================================================================
   HEALTH CHECK
================================================================ */
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "WHMS backend is running" });
});

/* ================================================================
   INIT FUNCTION
   – Seeds RBAC
   – Initializes Plugin System
   – Initializes Marketplace Module (with plugin engine)
   – Initializes Automation Module (new architecture)
   – Starts Worker (BullMQ worker)
================================================================ */
async function init() {
  console.log("🚀 Initializing core modules...");

  /* ------------------------------------------------------------
     1. RBAC SEED (Required for admin)
  ------------------------------------------------------------ */
  const { seedRBAC } = require("./modules/auth/seed/rbac-seed");
  await seedRBAC(prisma);
  console.log("🔐 RBAC seeded successfully!");

  /* ------------------------------------------------------------
     2. PLUGIN SYSTEM (MUST LOAD BEFORE AUTOMATION & MARKETPLACE)
     – Allows automation actions like plugin:<pluginId>:<actionName>
     – Allows marketplace to verify plugin compatibility
  ------------------------------------------------------------ */
  const automationLogger = require("./modules/automation/lib/logger");
  const initPluginModule = require("./modules/plugins");

  const pluginEngine = await initPluginModule({
    app,
    prisma,
    logger: console,
    ajv: new (require("ajv"))(),
    publicKeyPem: null,
  });

  app.locals.pluginEngine = pluginEngine;
  console.log("✅ Plugin engine initialized");

  /* ------------------------------------------------------------
     3. MARKETPLACE MODULE INITIALIZATION
     – Now that pluginEngine is available, initialize marketplace
     – Marketplace uses pluginEngine for verification
  ------------------------------------------------------------ */
   try {
  const initMarketplaceModule = require("./modules/marketplace");

  await initMarketplaceModule({
    app,
    prisma,
    logger: console,
    pluginEngine,
    pluginInstaller: pluginEngine?.installer,
    pluginVerifier: pluginEngine?.verifier,
    emailService: null,
    webhookService: null,
  });

  console.log("🏪 Marketplace module initialized successfully");
} catch (err) {
  console.error("❌ Marketplace initialization failed:", err.message);
}

     

// ============================================================
// END MARKETPLACE INITIALIZATION
// ============================================================

  /* ------------------------------------------------------------
     4. AUTOMATION MODULE INITIALIZATION
     – Registers controllers/routes
     – Loads tasks/profiles
     – Starts scheduler
  ------------------------------------------------------------ */
  const initAutomationModule = require("./modules/automation");

  const automation = await initAutomationModule({
    app,
    prismaClient: prisma,
    logger: automationLogger,
    config: {},
  });

  app.locals.scheduler = automation.scheduler;

  console.log("⚙️ Automation module initialized successfully");

  /* ------------------------------------------------------------
     5. START BACKGROUND WORKER
     – Processes queued jobs (task.run, profile.run)
     – Required for actual automation execution
  ------------------------------------------------------------ */
  const startWorker = require("./modules/automation/worker/worker");

  await startWorker({
    app,
    prisma,
    logger: automationLogger,
    concurrency: 5, // number of parallel jobs per worker
    queueName: "automation",
  });

  console.log("👷 Worker started – Automation engine is live!");
}

/* ================================================================
   GLOBAL ERROR HANDLER
   – Captures any unhandled backend errors
================================================================ */
app.use((err, req, res, next) => {
  console.error("🔥 Backend Error:", err);
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

/* ================================================================
   INIT IS CALLED HERE (IMPORTANT!)
================================================================ */
init()
  .then(() => console.log("✅ Backend initialized."))
  .catch(err => console.error("❌ INIT FAILED:", err));

/* ================================================================
   EXPORT APP (NOT INIT)
================================================================ */
module.exports = app;