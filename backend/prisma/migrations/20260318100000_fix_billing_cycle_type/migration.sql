-- AlterTable: Cast cycle column from BillingCycle enum to TEXT
ALTER TABLE "ServicePricing" ALTER COLUMN cycle TYPE TEXT USING cycle::text;

-- DropEnum
DROP TYPE IF EXISTS "BillingCycle";
