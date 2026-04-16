require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool, query, transaction } = require('./index');
const logger = require('../common/utils/logger');
const { generateSecureToken } = require('../common/utils/crypto');

const SALT_ROUNDS = 12;

// ── Seed data ─────────────────────────────────────────────────────────────────

const USERS = [
  { email: 'superadmin@whms.dev', password: 'Admin@1234!', role: 'admin',  label: 'Super Admin' },
  { email: 'alice@acme.dev',      password: 'User@1234!',  role: 'user',   label: 'Alice (active + agent online)' },
  { email: 'bob@techcorp.dev',    password: 'User@1234!',  role: 'user',   label: 'Bob (active, no agent)' },
  { email: 'carol@startup.dev',   password: 'User@1234!',  role: 'user',   label: 'Carol (pending, no plan)' },
  { email: 'dave@legacy.dev',     password: 'User@1234!',  role: 'user',   label: 'Dave (suspended)' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function upsertUser(client, { email, password, role }) {
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await client.query(
    `INSERT INTO users (email, password, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password,
           role     = EXCLUDED.role,
           updated_at = NOW()
     RETURNING id, email, role`,
    [email, hashed, role]
  );
  return rows[0];
}

async function getPlanByName(client, name) {
  const { rows } = await client.query('SELECT * FROM plans WHERE name = $1', [name]);
  return rows[0] || null;
}

async function upsertTenant(client, userId, planId, status) {
  const { rows } = await client.query(
    `INSERT INTO tenants (user_id, plan_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE
       SET plan_id = EXCLUDED.plan_id,
           status  = EXCLUDED.status,
           updated_at = NOW()
     RETURNING *`,
    [userId, planId, status]
  );
  return rows[0];
}

async function upsertSubscription(client, tenantId, planId, renewalMonths = 1) {
  const renewal = new Date();
  renewal.setMonth(renewal.getMonth() + renewalMonths);

  await client.query(
    `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
     WHERE tenant_id = $1 AND status = 'active'`,
    [tenantId]
  );
  const { rows } = await client.query(
    `INSERT INTO subscriptions (tenant_id, plan_id, renewal_date)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [tenantId, planId, renewal]
  );
  return rows[0];
}

async function upsertAgent(client, tenantId, opts = {}) {
  const token = generateSecureToken(40);
  const { rows } = await client.query(
    `INSERT INTO agents (tenant_id, token, hostname, status, uptime, last_seen, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id) DO UPDATE
       SET token    = EXCLUDED.token,
           hostname = EXCLUDED.hostname,
           status   = EXCLUDED.status,
           uptime   = EXCLUDED.uptime,
           last_seen = EXCLUDED.last_seen,
           metadata  = EXCLUDED.metadata,
           updated_at = NOW()
     RETURNING *`,
    [
      tenantId,
      token,
      opts.hostname  || 'srv-seed-01',
      opts.status    || 'online',
      opts.uptime    || 86400,
      opts.last_seen || new Date(),
      JSON.stringify(opts.metadata || { os: 'Ubuntu 22.04', arch: 'x86_64' }),
    ]
  );
  return rows[0];
}

async function insertCommand(client, tenantId, adminId, type, status, result = null) {
  const executedAt = status === 'executed' || status === 'failed' ? new Date() : null;
  const { rows } = await client.query(
    `INSERT INTO commands (tenant_id, type, status, payload, result, created_by, executed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [tenantId, type, status, '{}', result ? JSON.stringify(result) : null, adminId, executedAt]
  );
  return rows[0];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  logger.info('Starting seed...');

  await transaction(async (client) => {

    // 1. Plans (already seeded by migration, just fetch them)
    const planStarter  = await getPlanByName(client, 'starter');
    const planPro      = await getPlanByName(client, 'pro');
    const planBusiness = await getPlanByName(client, 'business');

    if (!planStarter || !planPro || !planBusiness) {
      throw new Error('Plans not found — run migrations first (npm run migrate)');
    }

    // 2. Users
    const admin = await upsertUser(client, USERS[0]);
    const alice  = await upsertUser(client, USERS[1]);
    const bob    = await upsertUser(client, USERS[2]);
    const carol  = await upsertUser(client, USERS[3]);
    const dave   = await upsertUser(client, USERS[4]);

    logger.info(`Users ready: ${[admin, alice, bob, carol, dave].map(u => u.email).join(', ')}`);

    // Admin gets a tenant too (for completeness)
    await upsertTenant(client, admin.id, planBusiness.id, 'active');

    // 3. Alice — Pro plan, active, agent online, some commands
    const aliceTenant = await upsertTenant(client, alice.id, planPro.id, 'active');
    await upsertSubscription(client, aliceTenant.id, planPro.id, 1);
    await upsertAgent(client, aliceTenant.id, {
      hostname: 'alice-srv-prod-01',
      status: 'online',
      uptime: 432000,
      last_seen: new Date(),
      metadata: { os: 'Ubuntu 22.04', arch: 'x86_64', whms_version: '2.1.0' },
    });
    await insertCommand(client, aliceTenant.id, admin.id, 'restart', 'executed',
      { success: true, output: 'WHMS restarted successfully' });
    await insertCommand(client, aliceTenant.id, admin.id, 'suspend', 'executed',
      { success: true, output: 'WHMS suspended' });
    await insertCommand(client, aliceTenant.id, admin.id, 'resume',  'executed',
      { success: true, output: 'WHMS resumed' });

    // 4. Bob — Starter plan, active, no agent yet
    const bobTenant = await upsertTenant(client, bob.id, planStarter.id, 'active');
    await upsertSubscription(client, bobTenant.id, planStarter.id, 1);
    await insertCommand(client, bobTenant.id, admin.id, 'restart', 'pending');

    // 5. Carol — No plan, pending, no agent
    await upsertTenant(client, carol.id, null, 'pending');

    // 6. Dave — Business plan, suspended, degraded agent
    const daveTenant = await upsertTenant(client, dave.id, planBusiness.id, 'suspended');
    await upsertSubscription(client, daveTenant.id, planBusiness.id, 1);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    await upsertAgent(client, daveTenant.id, {
      hostname: 'dave-srv-legacy-01',
      status: 'degraded',
      uptime: 1200,
      last_seen: fiveMinAgo,
      metadata: { os: 'CentOS 7', arch: 'x86_64', whms_version: '1.8.3' },
    });
    await insertCommand(client, daveTenant.id, admin.id, 'suspend', 'executed',
      { success: true, output: 'Suspended by admin' });
    await insertCommand(client, daveTenant.id, admin.id, 'restart', 'failed',
      { success: false, output: 'Timeout: agent did not respond' });

  });

  logger.info('');
  logger.info('════════════════════════════════════════════════════');
  logger.info('  Seed completed successfully');
  logger.info('════════════════════════════════════════════════════');
  logger.info('');
  logger.info('  Test accounts (all passwords below):');
  logger.info('');
  logger.info('  ADMIN');
  logger.info('    email : superadmin@whms.dev');
  logger.info('    pass  : Admin@1234!');
  logger.info('    role  : admin');
  logger.info('');
  logger.info('  USERS');
  logger.info('    alice@acme.dev      / User@1234!  → Pro,      active,    agent online');
  logger.info('    bob@techcorp.dev    / User@1234!  → Starter,  active,    no agent');
  logger.info('    carol@startup.dev   / User@1234!  → no plan,  pending,   no agent');
  logger.info('    dave@legacy.dev     / User@1234!  → Business, suspended, agent degraded');
  logger.info('');
  logger.info('════════════════════════════════════════════════════');
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    logger.error('Seed failed', { error: err.message });
    pool.end();
    process.exit(1);
  });
