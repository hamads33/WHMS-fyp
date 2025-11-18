// Small executor utility if you later want to move runs to queue processing
const automationService = require('../services/automation.service');
async function execTaskById(task) {
  return automationService.executeTaskRun(task);
}
module.exports = { execTaskById };
