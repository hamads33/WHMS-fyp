-- ============================================================
-- Extend plans table for full admin customization
-- ============================================================

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle  TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time', 'custom')),
  ADD COLUMN IF NOT EXISTS trial_days     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata       JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_plans_sort_order ON plans (sort_order);
CREATE INDEX IF NOT EXISTS idx_plans_billing_cycle ON plans (billing_cycle);

-- Back-fill sort_order for existing seeded plans
UPDATE plans SET sort_order = 1 WHERE name = 'starter';
UPDATE plans SET sort_order = 2 WHERE name = 'pro';
UPDATE plans SET sort_order = 3 WHERE name = 'business';
