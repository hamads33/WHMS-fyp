-- ============================================================
-- SERVICES MODULE ENHANCEMENT MIGRATION
-- Replaces old Int-based service tables with UUID-based enhanced schema
-- ============================================================

-- Step 1: Nullify Order.snapshotId (old snapshots will be dropped)
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_snapshotId_fkey";
ALTER TABLE "Order" ALTER COLUMN "snapshotId" DROP NOT NULL;
UPDATE "Order" SET "snapshotId" = NULL;
ALTER TABLE "Order" ALTER COLUMN "snapshotId" TYPE TEXT USING NULL;

-- Step 2: Drop old service tables in dependency order
DROP TABLE IF EXISTS "ServiceFeatureList";
DROP TABLE IF EXISTS "ServicePolicy";
DROP TABLE IF EXISTS "ServiceSnapshot";
DROP TABLE IF EXISTS "ServicePricing";
DROP TABLE IF EXISTS "ServicePlan";
DROP TABLE IF EXISTS "Service";

-- ============================================================
-- Step 3: Create ServiceGroup
-- ============================================================

CREATE TABLE "ServiceGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceGroup_name_key" ON "ServiceGroup"("name");
CREATE UNIQUE INDEX "ServiceGroup_slug_key" ON "ServiceGroup"("slug");

-- ============================================================
-- Step 4: Create Service
-- ============================================================

CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "groupId" TEXT,
    "parentServiceId" TEXT,
    "moduleName" TEXT,
    "moduleType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "autoSetup" BOOLEAN NOT NULL DEFAULT true,
    "autoSuspend" BOOLEAN NOT NULL DEFAULT true,
    "autoTerminate" BOOLEAN NOT NULL DEFAULT false,
    "customizeOption" TEXT NOT NULL DEFAULT 'none',
    "paymentType" TEXT NOT NULL DEFAULT 'regular',
    "requiresDomain" BOOLEAN NOT NULL DEFAULT false,
    "allowAutoRenew" BOOLEAN NOT NULL DEFAULT true,
    "billingCycles" TEXT NOT NULL DEFAULT 'monthly,quarterly,semi_annually,annually',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");
CREATE INDEX "Service_groupId_idx" ON "Service"("groupId");
CREATE INDEX "Service_parentServiceId_idx" ON "Service"("parentServiceId");
CREATE INDEX "Service_active_idx" ON "Service"("active");

-- ============================================================
-- Step 5: Create ServiceAddon
-- ============================================================

CREATE TABLE "ServiceAddon" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "setupFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "maxQuantity" INTEGER,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "billingType" TEXT NOT NULL DEFAULT 'shared',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceAddon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceAddon_serviceId_code_key" ON "ServiceAddon"("serviceId", "code");
CREATE INDEX "ServiceAddon_serviceId_idx" ON "ServiceAddon"("serviceId");
CREATE INDEX "ServiceAddon_active_idx" ON "ServiceAddon"("active");

-- ============================================================
-- Step 6: Create ServiceFeature
-- ============================================================

CREATE TABLE "ServiceFeature" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "unit" TEXT,
    "icon" TEXT,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceFeature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceFeature_serviceId_key_key" ON "ServiceFeature"("serviceId", "key");
CREATE INDEX "ServiceFeature_serviceId_idx" ON "ServiceFeature"("serviceId");

-- ============================================================
-- Step 7: Create ServicePlan
-- ============================================================

CREATE TABLE "ServicePlan" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "paymentType" TEXT NOT NULL DEFAULT 'regular',
    "minimumBillingCycles" INTEGER NOT NULL DEFAULT 1,
    "maximumBillingCycles" INTEGER,
    "allowAutoSetup" BOOLEAN NOT NULL DEFAULT true,
    "customizeOption" TEXT NOT NULL DEFAULT 'none',
    "showDomainOptions" BOOLEAN NOT NULL DEFAULT false,
    "maxClients" INTEGER,
    "maxOrders" INTEGER,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "stockLimit" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServicePlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServicePlan_serviceId_name_key" ON "ServicePlan"("serviceId", "name");
CREATE INDEX "ServicePlan_serviceId_idx" ON "ServicePlan"("serviceId");
CREATE INDEX "ServicePlan_active_idx" ON "ServicePlan"("active");

-- ============================================================
-- Step 8: Create ServicePricing
-- ============================================================

CREATE TABLE "ServicePricing" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "setupFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL,
    "renewalPrice" DECIMAL(10,2),
    "suspensionFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "terminationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "discountType" TEXT,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountValidUntil" TIMESTAMP(3),
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServicePricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServicePricing_planId_cycle_key" ON "ServicePricing"("planId", "cycle");
CREATE INDEX "ServicePricing_planId_idx" ON "ServicePricing"("planId");
CREATE INDEX "ServicePricing_active_idx" ON "ServicePricing"("active");

-- ============================================================
-- Step 9: Create ServicePlanFeature
-- ============================================================

CREATE TABLE "ServicePlanFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "ServicePlanFeature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServicePlanFeature_planId_featureId_key" ON "ServicePlanFeature"("planId", "featureId");
CREATE INDEX "ServicePlanFeature_planId_idx" ON "ServicePlanFeature"("planId");
CREATE INDEX "ServicePlanFeature_featureId_idx" ON "ServicePlanFeature"("featureId");

-- ============================================================
-- Step 10: Create ServicePlanAddon
-- ============================================================

CREATE TABLE "ServicePlanAddon" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ServicePlanAddon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServicePlanAddon_planId_addonId_key" ON "ServicePlanAddon"("planId", "addonId");
CREATE INDEX "ServicePlanAddon_planId_idx" ON "ServicePlanAddon"("planId");
CREATE INDEX "ServicePlanAddon_addonId_idx" ON "ServicePlanAddon"("addonId");

-- ============================================================
-- Step 11: Create ServiceAddonPricing
-- ============================================================

CREATE TABLE "ServiceAddonPricing" (
    "id" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "setupFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "renewalPrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    CONSTRAINT "ServiceAddonPricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceAddonPricing_addonId_cycle_key" ON "ServiceAddonPricing"("addonId", "cycle");
CREATE INDEX "ServiceAddonPricing_addonId_idx" ON "ServiceAddonPricing"("addonId");

-- ============================================================
-- Step 12: Create ServiceConfiguration
-- ============================================================

CREATE TABLE "ServiceConfiguration" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT,
    CONSTRAINT "ServiceConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceConfiguration_serviceId_key_key" ON "ServiceConfiguration"("serviceId", "key");
CREATE INDEX "ServiceConfiguration_serviceId_idx" ON "ServiceConfiguration"("serviceId");

-- ============================================================
-- Step 13: Create ServicePlanConfiguration
-- ============================================================

CREATE TABLE "ServicePlanConfiguration" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "ServicePlanConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServicePlanConfiguration_planId_idx" ON "ServicePlanConfiguration"("planId");

-- ============================================================
-- Step 14: Create ServiceAutomation
-- ============================================================

CREATE TABLE "ServiceAutomation" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT,
    "provisioningKey" TEXT,
    "webhookUrl" TEXT,
    "emailTemplate" TEXT,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceAutomation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceAutomation_serviceId_idx" ON "ServiceAutomation"("serviceId");
CREATE INDEX "ServiceAutomation_event_idx" ON "ServiceAutomation"("event");

-- ============================================================
-- Step 15: Create ServicePlanAutomation
-- ============================================================

CREATE TABLE "ServicePlanAutomation" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ServicePlanAutomation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServicePlanAutomation_planId_idx" ON "ServicePlanAutomation"("planId");

-- ============================================================
-- Step 16: Create ServicePolicy (Service-level)
-- ============================================================

CREATE TABLE "ServicePolicy" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT,
    "enforced" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ServicePolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServicePolicy_serviceId_key_key" ON "ServicePolicy"("serviceId", "key");
CREATE INDEX "ServicePolicy_serviceId_idx" ON "ServicePolicy"("serviceId");

-- ============================================================
-- Step 17: Create ServicePlanPolicy (Plan-level)
-- ============================================================

CREATE TABLE "ServicePlanPolicy" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "ServicePlanPolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServicePlanPolicy_planId_idx" ON "ServicePlanPolicy"("planId");

-- ============================================================
-- Step 18: Create ServiceSnapshot
-- ============================================================

CREATE TABLE "ServiceSnapshot" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "service" JSONB NOT NULL,
    "planData" JSONB NOT NULL,
    "pricing" JSONB NOT NULL,
    "features" JSONB NOT NULL,
    "addons" JSONB,
    "policies" JSONB,
    "automations" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceSnapshot_planId_idx" ON "ServiceSnapshot"("planId");

-- ============================================================
-- Step 19: Create ServiceUpgradePath
-- ============================================================

CREATE TABLE "ServiceUpgradePath" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "fromPlanId" TEXT NOT NULL,
    "toPlanId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "prorated" BOOLEAN NOT NULL DEFAULT true,
    "creditUnused" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceUpgradePath_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceUpgradePath_fromPlanId_toPlanId_key" ON "ServiceUpgradePath"("fromPlanId", "toPlanId");
CREATE INDEX "ServiceUpgradePath_serviceId_idx" ON "ServiceUpgradePath"("serviceId");

-- ============================================================
-- Step 20: Create ServiceTemplate
-- ============================================================

CREATE TABLE "ServiceTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "plans" JSONB NOT NULL,
    "addons" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceTemplate_name_key" ON "ServiceTemplate"("name");

-- ============================================================
-- Step 21: Add Foreign Keys
-- ============================================================

-- Service FK
ALTER TABLE "Service" ADD CONSTRAINT "Service_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "ServiceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Service" ADD CONSTRAINT "Service_parentServiceId_fkey"
    FOREIGN KEY ("parentServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ServiceAddon FK
ALTER TABLE "ServiceAddon" ADD CONSTRAINT "ServiceAddon_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServiceFeature FK
ALTER TABLE "ServiceFeature" ADD CONSTRAINT "ServiceFeature_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServicePlan FK
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServicePricing FK
ALTER TABLE "ServicePricing" ADD CONSTRAINT "ServicePricing_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServicePlanFeature FKs
ALTER TABLE "ServicePlanFeature" ADD CONSTRAINT "ServicePlanFeature_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServicePlanFeature" ADD CONSTRAINT "ServicePlanFeature_featureId_fkey"
    FOREIGN KEY ("featureId") REFERENCES "ServiceFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServicePlanAddon FKs
ALTER TABLE "ServicePlanAddon" ADD CONSTRAINT "ServicePlanAddon_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServicePlanAddon" ADD CONSTRAINT "ServicePlanAddon_addonId_fkey"
    FOREIGN KEY ("addonId") REFERENCES "ServiceAddon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServiceAddonPricing FK
ALTER TABLE "ServiceAddonPricing" ADD CONSTRAINT "ServiceAddonPricing_addonId_fkey"
    FOREIGN KEY ("addonId") REFERENCES "ServiceAddon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServiceConfiguration FK
ALTER TABLE "ServiceConfiguration" ADD CONSTRAINT "ServiceConfiguration_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServicePlanConfiguration FK
ALTER TABLE "ServicePlanConfiguration" ADD CONSTRAINT "ServicePlanConfiguration_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServiceAutomation FK
ALTER TABLE "ServiceAutomation" ADD CONSTRAINT "ServiceAutomation_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServicePlanAutomation FK
ALTER TABLE "ServicePlanAutomation" ADD CONSTRAINT "ServicePlanAutomation_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServicePolicy FK
ALTER TABLE "ServicePolicy" ADD CONSTRAINT "ServicePolicy_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServicePlanPolicy FK
ALTER TABLE "ServicePlanPolicy" ADD CONSTRAINT "ServicePlanPolicy_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServiceSnapshot FK
ALTER TABLE "ServiceSnapshot" ADD CONSTRAINT "ServiceSnapshot_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServiceUpgradePath FKs
ALTER TABLE "ServiceUpgradePath" ADD CONSTRAINT "ServiceUpgradePath_fromPlanId_fkey"
    FOREIGN KEY ("fromPlanId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceUpgradePath" ADD CONSTRAINT "ServiceUpgradePath_toPlanId_fkey"
    FOREIGN KEY ("toPlanId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Order → ServiceSnapshot FK (now optional)
ALTER TABLE "Order" ADD CONSTRAINT "Order_snapshotId_fkey"
    FOREIGN KEY ("snapshotId") REFERENCES "ServiceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
