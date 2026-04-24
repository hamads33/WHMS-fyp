const express = require("express");

function createAuditRoutes(auditController) {
  const router = express.Router();

  // Count must come BEFORE generic logs route to avoid param confusion
  router.get("/logs/count", auditController.countLogs.bind(auditController));

  // Entity and user specific routes
  router.get("/logs/entity/:entityType/:entityId", auditController.getEntityLogs.bind(auditController));
  router.get("/logs/user/:userId", auditController.getUserLogs.bind(auditController));

  // Generic logs route (must come after specific routes)
  router.get("/logs", auditController.listLogs.bind(auditController));

  // Sources and stats
  router.get("/sources", auditController.getSources.bind(auditController));
  router.get("/stats", auditController.getStats.bind(auditController));

  return router;
}

module.exports = { createAuditRoutes };