const { query } = require('../../database');

async function create(userId) {
  const { rows } = await query(
    `INSERT INTO tenants (user_id)
     VALUES ($1)
     RETURNING *`,
    [userId]
  );
  return rows[0];
}

async function findByUserId(userId) {
  const { rows } = await query(
    `SELECT t.*, p.name AS plan_name, p.price AS plan_price, p.features AS plan_features,
            a.status AS agent_status, a.last_seen AS agent_last_seen,
            a.hostname AS agent_hostname, a.uptime AS agent_uptime
     FROM tenants t
     LEFT JOIN plans p ON p.id = t.plan_id
     LEFT JOIN agents a ON a.tenant_id = t.id
     WHERE t.user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT t.*, p.name AS plan_name, p.price AS plan_price
     FROM tenants t
     LEFT JOIN plans p ON p.id = t.plan_id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function updateStatus(id, status) {
  const { rows } = await query(
    `UPDATE tenants SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );
  return rows[0] || null;
}

async function listAll({ limit = 50, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT t.*, u.email, p.name AS plan_name,
            COUNT(*) OVER() AS total_count
     FROM tenants t
     JOIN users u ON u.id = t.user_id
     LEFT JOIN plans p ON p.id = t.plan_id
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const total = rows.length ? parseInt(rows[0].total_count, 10) : 0;
  const data  = rows.map(({ total_count, ...r }) => r);
  return { rows: data, total };
}

module.exports = { create, findByUserId, findById, updateStatus, listAll };
