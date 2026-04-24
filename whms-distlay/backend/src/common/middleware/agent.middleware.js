const { query } = require('../../database');
const { unauthorized } = require('../utils/response');

async function authenticateAgent(req, res, next) {
  const token = req.headers['x-agent-token'];
  if (!token) return unauthorized(res, 'Agent token required');

  try {
    const { rows } = await query(
      `SELECT a.*, t.status AS tenant_status
       FROM agents a
       JOIN tenants t ON t.id = a.tenant_id
       WHERE a.token = $1`,
      [token]
    );

    if (!rows.length) return unauthorized(res, 'Invalid agent token');

    const agent = rows[0];
    if (agent.tenant_status === 'suspended') {
      return unauthorized(res, 'Tenant is suspended');
    }

    req.agent = agent;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticateAgent };
