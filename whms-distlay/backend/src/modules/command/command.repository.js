const { query } = require('../../database');

async function create(tenantId, type, payload, createdBy) {
  const { rows } = await query(
    `INSERT INTO commands (tenant_id, type, payload, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [tenantId, type, JSON.stringify(payload || {}), createdBy]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM commands WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findPendingByTenantId(tenantId) {
  const { rows } = await query(
    `SELECT * FROM commands
     WHERE tenant_id = $1 AND status = 'pending'
     ORDER BY created_at ASC`,
    [tenantId]
  );
  return rows;
}

async function markDispatched(ids) {
  if (!ids.length) return;
  await query(
    `UPDATE commands SET status = 'dispatched'
     WHERE id = ANY($1::uuid[])`,
    [ids]
  );
}

async function markExecuted(id, success, output) {
  const status = success ? 'executed' : 'failed';
  const { rows } = await query(
    `UPDATE commands
     SET status = $1, result = $2, executed_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, JSON.stringify({ success, output }), id]
  );
  return rows[0] || null;
}

async function listByTenantId(tenantId, { limit = 50, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM commands
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );
  const total = rows.length ? parseInt(rows[0].total_count, 10) : 0;
  const data  = rows.map(({ total_count, ...r }) => r);
  return { rows: data, total };
}

async function listAll({ limit = 50, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT c.*, u.email AS tenant_email, COUNT(*) OVER() AS total_count
     FROM commands c
     JOIN tenants t ON t.id = c.tenant_id
     JOIN users u ON u.id = t.user_id
     ORDER BY c.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const total = rows.length ? parseInt(rows[0].total_count, 10) : 0;
  const data  = rows.map(({ total_count, ...r }) => r);
  return { rows: data, total };
}

module.exports = {
  create,
  findById,
  findPendingByTenantId,
  markDispatched,
  markExecuted,
  listByTenantId,
  listAll,
};
