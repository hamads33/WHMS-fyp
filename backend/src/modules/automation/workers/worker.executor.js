// src/modules/automation/workers/worker.executor.js
// Small executor utility wrapper (keeps API stable if referenced elsewhere)

const automationService = require('../services/automation.service');

async function execTaskById(task) {
  return automationService.executeTaskRun(task);
}

module.exports = { execTaskById };
