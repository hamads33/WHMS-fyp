const express = require("express");

const serverRoutes           = require("./routes/server.routes");
const groupRoutes            = require("./routes/server-group.routes");
const logsRoutes             = require("./routes/logs.routes");
const provisioningQueueRoutes = require("./routes/provisioning-queue.routes");
const webhookRoutes          = require("./routes/webhook.routes");

const provisioningWorker = require("./services/provisioning-worker.service");
const serverMonitor      = require("./services/server-monitor.service");
const webhookService     = require("./services/webhook.service");

const router = express.Router();

// ── Routes ────────────────────────────────────────────────────
router.use("/servers",            serverRoutes);
router.use("/server-groups",      groupRoutes);
router.use("/server-logs",        logsRoutes);
router.use("/provisioning-jobs",  provisioningQueueRoutes);
router.use("/webhooks",           webhookRoutes);

// ── Background Workers ────────────────────────────────────────
// Wire webhook service into monitor so it can emit events
serverMonitor.setWebhookService(webhookService);

// Start workers (non-blocking — safe to call multiple times)
provisioningWorker.start();
serverMonitor.start();

module.exports = router;
