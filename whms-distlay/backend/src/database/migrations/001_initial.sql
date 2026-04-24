-- ============================================================
-- WHMS Distlay – Initial Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- users
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ----------------------------------------------------------------
-- plans
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  features    JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- tenants
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id     UUID REFERENCES plans(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants (user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status);

-- ----------------------------------------------------------------
-- subscriptions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id       UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  renewal_date  TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_date ON subscriptions (renewal_date);

-- ----------------------------------------------------------------
-- install_tokens
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS install_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_install_tokens_token ON install_tokens (token);
CREATE INDEX IF NOT EXISTS idx_install_tokens_tenant_id ON install_tokens (tenant_id);

-- ----------------------------------------------------------------
-- agents
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  hostname    TEXT,
  status      TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'degraded')),
  uptime      BIGINT,
  last_seen   TIMESTAMPTZ,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_token ON agents (token);

-- ----------------------------------------------------------------
-- commands
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('suspend', 'resume', 'restart')),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'executed', 'failed')),
  payload     JSONB NOT NULL DEFAULT '{}',
  result      JSONB,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_commands_tenant_id ON commands (tenant_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON commands (status);
CREATE INDEX IF NOT EXISTS idx_commands_tenant_pending ON commands (tenant_id, status) WHERE status = 'pending';

-- ----------------------------------------------------------------
-- Seed default plans
-- ----------------------------------------------------------------
INSERT INTO plans (name, price, features) VALUES
  ('starter',  9.99,  '{"instances": 1, "storage_gb": 5,  "support": "community"}'),
  ('pro',      29.99, '{"instances": 3, "storage_gb": 20, "support": "email"}'),
  ('business', 79.99, '{"instances": 10,"storage_gb": 100,"support": "priority"}')
ON CONFLICT (name) DO NOTHING;
