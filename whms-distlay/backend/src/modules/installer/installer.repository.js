const { query } = require('../../database');

async function createToken(tenantId, token, expiresAt) {
  const { rows } = await query(
    `INSERT INTO install_tokens (tenant_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [tenantId, token, expiresAt]
  );
  return rows[0];
}

async function findToken(token) {
  const { rows } = await query(
    `SELECT it.*, t.status AS tenant_status
     FROM install_tokens it
     JOIN tenants t ON t.id = it.tenant_id
     WHERE it.token = $1`,
    [token]
  );
  return rows[0] || null;
}

async function markUsed(token) {
  const { rows } = await query(
    `UPDATE install_tokens
     SET used = TRUE, used_at = NOW()
     WHERE token = $1
     RETURNING *`,
    [token]
  );
  return rows[0] || null;
}

async function findByTenantId(tenantId) {
  const { rows } = await query(
    `SELECT * FROM install_tokens WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return rows;
}

module.exports = { createToken, findToken, markUsed, findByTenantId };
