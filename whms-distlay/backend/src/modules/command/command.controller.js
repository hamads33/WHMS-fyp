const commandService = require('./command.service');
const { ok, created, paginated } = require('../../common/utils/response');

async function createCommand(req, res, next) {
  try {
    const { tenant_id, type, payload } = req.body;
    const command = await commandService.issueCommand(req.user.sub, tenant_id, type, payload);
    return created(res, command);
  } catch (err) {
    next(err);
  }
}

async function listCommands(req, res, next) {
  try {
    const { tenant_id } = req.params;
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const { rows, total } = await commandService.getCommandsForTenant(tenant_id, { limit, offset: (page - 1) * limit });
    return paginated(res, { data: rows, total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function getCommand(req, res, next) {
  try {
    const command = await commandService.getById(req.params.id);
    return ok(res, command);
  } catch (err) {
    next(err);
  }
}

async function listAllCommands(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const { rows, total } = await commandService.listAll({ limit, offset: (page - 1) * limit });
    return paginated(res, { data: rows, total, page, limit });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCommand, listAllCommands, listCommands, getCommand };
