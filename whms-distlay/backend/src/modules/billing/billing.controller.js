const billingService = require('./billing.service');
const { ok, created, noContent } = require('../../common/utils/response');

// ── Public ────────────────────────────────────────────────────────────────────

async function getPlans(req, res, next) {
  try {
    return ok(res, await billingService.getPlans());
  } catch (err) { next(err); }
}

async function getPlanById(req, res, next) {
  try {
    return ok(res, await billingService.getPlanById(req.params.id));
  } catch (err) { next(err); }
}

async function getMySubscription(req, res, next) {
  try {
    return ok(res, await billingService.getSubscription(req.user.sub));
  } catch (err) { next(err); }
}

async function subscribe(req, res, next) {
  try {
    return created(res, await billingService.subscribe(req.user.sub, req.body.plan_id));
  } catch (err) { next(err); }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function adminListPlans(req, res, next) {
  try {
    return ok(res, await billingService.adminGetAllPlans());
  } catch (err) { next(err); }
}

async function createPlan(req, res, next) {
  try {
    const plan = await billingService.createPlan(req.body);
    return created(res, plan);
  } catch (err) { next(err); }
}

async function updatePlan(req, res, next) {
  try {
    const plan = await billingService.updatePlan(req.params.id, req.body);
    return ok(res, plan);
  } catch (err) { next(err); }
}

async function deletePlan(req, res, next) {
  try {
    const plan = await billingService.deletePlan(req.params.id);
    return ok(res, plan);
  } catch (err) { next(err); }
}

module.exports = {
  getPlans,
  getPlanById,
  getMySubscription,
  subscribe,
  adminListPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
