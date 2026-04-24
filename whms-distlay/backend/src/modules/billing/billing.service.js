const billingRepo = require('./billing.repository');
const tenantService = require('../tenant/tenant.service');

// ── Public ────────────────────────────────────────────────────────────────────

async function getPlans() {
  return billingRepo.findAllPlans();
}

async function getPlanById(id) {
  const plan = await billingRepo.findPlanById(id);
  if (!plan) {
    const err = new Error('Plan not found');
    err.status = 404;
    throw err;
  }
  return plan;
}

async function getSubscription(userId) {
  const tenant = await tenantService.getForCurrentUser(userId);
  return billingRepo.findActiveSubscription(tenant.id);
}

async function subscribe(userId, planId) {
  const tenant = await tenantService.getForCurrentUser(userId);

  const plan = await billingRepo.findPlanById(planId);
  if (!plan) {
    const err = new Error('Plan not found');
    err.status = 404;
    throw err;
  }
  if (!plan.is_active) {
    const err = new Error('Plan is no longer available');
    err.status = 410;
    throw err;
  }

  const renewalDate = computeRenewalDate(plan.billing_cycle, plan.metadata);
  const subscription = await billingRepo.subscribe(tenant.id, planId, renewalDate);
  return { subscription, plan };
}

function computeRenewalDate(billingCycle, metadata = {}) {
  const d = new Date();
  switch (billingCycle) {
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'one_time':
      d.setFullYear(d.getFullYear() + 100);
      break;
    case 'custom':
      d.setDate(d.getDate() + (metadata.billing_days || 30));
      break;
    default: // monthly
      d.setMonth(d.getMonth() + 1);
  }
  return d;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function adminGetAllPlans() {
  return billingRepo.findAllPlansAdmin();
}

async function createPlan(data) {
  const existing = await billingRepo.findAllPlans();
  if (existing.some((p) => p.name.toLowerCase() === data.name.toLowerCase())) {
    const err = new Error(`Plan name "${data.name}" already exists`);
    err.status = 409;
    throw err;
  }
  return billingRepo.createPlan(data);
}

async function updatePlan(id, data) {
  const plan = await billingRepo.findPlanById(id);
  if (!plan) {
    const err = new Error('Plan not found');
    err.status = 404;
    throw err;
  }

  if (data.name && data.name.toLowerCase() !== plan.name.toLowerCase()) {
    const all = await billingRepo.findAllPlansAdmin();
    if (all.some((p) => p.id !== id && p.name.toLowerCase() === data.name.toLowerCase())) {
      const err = new Error(`Plan name "${data.name}" already taken`);
      err.status = 409;
      throw err;
    }
  }

  const updated = await billingRepo.updatePlan(id, data);
  return updated;
}

async function deletePlan(id) {
  const plan = await billingRepo.findPlanById(id);
  if (!plan) {
    const err = new Error('Plan not found');
    err.status = 404;
    throw err;
  }

  const count = await billingRepo.countActiveSubscriptions(id);
  if (count > 0) {
    const err = new Error(
      `Cannot deactivate plan — ${count} active subscription(s) still attached. ` +
      `Migrate subscribers first or set is_active=false via PATCH.`
    );
    err.status = 409;
    throw err;
  }

  return billingRepo.deletePlan(id);
}

module.exports = {
  getPlans,
  getPlanById,
  getSubscription,
  subscribe,
  adminGetAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
