const { query, transaction } = require('../../database');

// ── Public ────────────────────────────────────────────────────────────────────

async function findAllPlans() {
  const { rows } = await query(
    `SELECT * FROM plans
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, price ASC`
  );
  return rows;
}

async function findPlanById(id) {
  const { rows } = await query('SELECT * FROM plans WHERE id = $1', [id]);
  return rows[0] || null;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function findAllPlansAdmin() {
  const { rows } = await query(
    `SELECT p.*,
            COUNT(s.id) FILTER (WHERE s.status = 'active') AS active_subscribers
     FROM plans p
     LEFT JOIN subscriptions s ON s.plan_id = p.id
     GROUP BY p.id
     ORDER BY p.sort_order ASC, p.price ASC`
  );
  return rows;
}

async function createPlan({ name, price, description, billing_cycle, trial_days, sort_order, features, metadata }) {
  const { rows } = await query(
    `INSERT INTO plans
       (name, price, description, billing_cycle, trial_days, sort_order, features, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      name,
      price,
      description ?? null,
      billing_cycle ?? 'monthly',
      trial_days ?? 0,
      sort_order ?? 0,
      JSON.stringify(features ?? {}),
      JSON.stringify(metadata ?? {}),
    ]
  );
  return rows[0];
}

async function updatePlan(id, fields) {
  const allowed = ['name', 'price', 'description', 'billing_cycle', 'trial_days',
                   'sort_order', 'features', 'metadata', 'is_active'];

  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in fields) {
      const val = (key === 'features' || key === 'metadata')
        ? JSON.stringify(fields[key])
        : fields[key];
      setClauses.push(`${key} = $${idx++}`);
      values.push(val);
    }
  }

  if (!setClauses.length) return findPlanById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await query(
    `UPDATE plans SET ${setClauses.join(', ')}
     WHERE id = $${idx}
     RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deletePlan(id) {
  const { rows } = await query(
    `UPDATE plans SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

async function countActiveSubscriptions(planId) {
  const { rows } = await query(
    `SELECT COUNT(*) AS count FROM subscriptions
     WHERE plan_id = $1 AND status = 'active'`,
    [planId]
  );
  return parseInt(rows[0].count, 10);
}

// ── User ──────────────────────────────────────────────────────────────────────

async function findActiveSubscription(tenantId) {
  const { rows } = await query(
    `SELECT s.*, p.name AS plan_name, p.price, p.billing_cycle,
            p.features, p.trial_days, p.description
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.tenant_id = $1 AND s.status = 'active'
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [tenantId]
  );
  return rows[0] || null;
}

async function subscribe(tenantId, planId, renewalDate) {
  return transaction(async (client) => {
    await client.query(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
       WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );

    const { rows } = await client.query(
      `INSERT INTO subscriptions (tenant_id, plan_id, renewal_date)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tenantId, planId, renewalDate]
    );

    await client.query(
      `UPDATE tenants SET plan_id = $1, status = 'active', updated_at = NOW()
       WHERE id = $2`,
      [planId, tenantId]
    );

    return rows[0];
  });
}

module.exports = {
  findAllPlans,
  findPlanById,
  findAllPlansAdmin,
  createPlan,
  updatePlan,
  deletePlan,
  countActiveSubscriptions,
  findActiveSubscription,
  subscribe,
};
