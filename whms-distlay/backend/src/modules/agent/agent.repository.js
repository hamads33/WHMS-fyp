const { query } = require('../../database');

async function provision(tenantId, token) {
  const { rows } = await query(
    `INSERT INTO agents (tenant_id, token)
     VALUES ($1, $2)
     ON CONFLICT (tenant_id) DO UPDATE
       SET token = EXCLUDED.token, updated_at = NOW()
     RETURNING *`,
    [tenantId, token]
  );
  return rows[0];
}

async function updateHeartbeat(agentId, status, uptime, hostname, metadata = {}) {
  const { rows } = await query(
    `UPDATE agents
     SET status = $1, uptime = $2, hostname = $3, metadata = $4,
         last_seen = NOW(), updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [status, uptime, hostname, JSON.stringify(metadata), agentId]
  );
  return rows[0] || null;
}

async function findByTenantId(tenantId) {
  const { rows } = await query(
    'SELECT * FROM agents WHERE tenant_id = $1',
    [tenantId]
  );
  return rows[0] || null;
}

module.exports = { provision, updateHeartbeat, findByTenantId };
