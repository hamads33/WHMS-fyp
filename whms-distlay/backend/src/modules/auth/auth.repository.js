const { query } = require('../../database');

async function findByEmail(email) {
  const { rows } = await query(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    'SELECT id, email, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function create(email, hashedPassword) {
  const { rows } = await query(
    `INSERT INTO users (email, password)
     VALUES ($1, $2)
     RETURNING id, email, role, created_at`,
    [email, hashedPassword]
  );
  return rows[0];
}

module.exports = { findByEmail, findById, create };
