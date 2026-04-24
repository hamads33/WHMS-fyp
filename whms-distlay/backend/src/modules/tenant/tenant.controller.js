const tenantService = require('./tenant.service');
const { ok, paginated } = require('../../common/utils/response');

async function getMyTenant(req, res, next) {
  try {
    const tenant = await tenantService.getForCurrentUser(req.user.sub);
    return ok(res, tenant);
  } catch (err) {
    next(err);
  }
}

async function getTenantById(req, res, next) {
  try {
    const tenant = await tenantService.getById(req.params.id);
    return ok(res, tenant);
  } catch (err) {
    next(err);
  }
}

async function updateTenantStatus(req, res, next) {
  try {
    const tenant = await tenantService.updateStatus(req.params.id, req.body.status);
    return ok(res, tenant);
  } catch (err) {
    next(err);
  }
}

async function listTenants(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const { rows, total } = await tenantService.listAll({ limit, offset: (page - 1) * limit });
    return paginated(res, { data: rows, total, page, limit });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyTenant, getTenantById, updateTenantStatus, listTenants };
