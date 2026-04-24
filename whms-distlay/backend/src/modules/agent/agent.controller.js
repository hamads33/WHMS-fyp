const agentService = require('./agent.service');
const { ok } = require('../../common/utils/response');

async function heartbeat(req, res, next) {
  try {
    const { status, uptime, hostname, metadata } = req.body;
    const agent = await agentService.heartbeat(req.agent, { status, uptime, hostname, metadata });
    return ok(res, { last_seen: agent.last_seen });
  } catch (err) {
    next(err);
  }
}

async function getCommands(req, res, next) {
  try {
    const commands = await agentService.getPendingCommands(req.agent);
    return ok(res, commands);
  } catch (err) {
    next(err);
  }
}

async function submitResult(req, res, next) {
  try {
    const { command_id, success, output } = req.body;
    const command = await agentService.submitResult(req.agent, { command_id, success, output });
    return ok(res, command);
  } catch (err) {
    next(err);
  }
}

module.exports = { heartbeat, getCommands, submitResult };
