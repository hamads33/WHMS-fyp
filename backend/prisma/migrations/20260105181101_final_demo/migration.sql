/*
  Warnings:

  - You are about to alter the column `name` on the `AutomationProfile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `cron` on the `AutomationProfile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `actionType` on the `AutomationTask` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to drop the column `basePrice` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the `Plugin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PluginSetting` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code]` on the table `Service` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('pending', 'running', 'success', 'failed', 'cancelled', 'timeout');

-- CreateEnum
CREATE TYPE "WorkflowTaskStatus" AS ENUM ('pending', 'running', 'success', 'failed', 'skipped', 'timeout');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'quarterly', 'semi_annually', 'annually');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'active', 'suspended', 'terminated', 'cancelled');

-- DropForeignKey
ALTER TABLE "AutomationRun" DROP CONSTRAINT "AutomationRun_taskId_fkey";

-- DropForeignKey
ALTER TABLE "PluginSetting" DROP CONSTRAINT "PluginSetting_pluginId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "profileId" INTEGER;

-- AlterTable
ALTER TABLE "AutomationProfile" ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "cron" DROP NOT NULL,
ALTER COLUMN "cron" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "AutomationTask" ALTER COLUMN "actionType" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "basePrice",
ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "country" TEXT,
ADD COLUMN     "deviceHash" TEXT,
ADD COLUMN     "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Plugin";

-- DropTable
DROP TABLE "PluginSetting";

-- CreateTable
CREATE TABLE "AutomationWorkflow" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "type" TEXT NOT NULL DEFAULT 'sequential',
    "eventType" TEXT,
    "eventFilter" JSONB,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" SERIAL NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "totalDuration" INTEGER,
    "taskCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedTaskId" TEXT,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "triggerId" TEXT,
    "input" JSONB,
    "output" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTaskRun" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "output" JSONB,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "conditionResult" BOOLEAN,
    "selectedPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTaskRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitRule" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "target" VARCHAR(255) NOT NULL,
    "limit" INTEGER NOT NULL,
    "window" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" SERIAL NOT NULL,
    "trigger" VARCHAR(100) NOT NULL,
    "actionType" VARCHAR(100),
    "method" VARCHAR(50) NOT NULL,
    "destination" VARCHAR(500) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionMetric" (
    "id" SERIAL NOT NULL,
    "actionType" VARCHAR(100) NOT NULL,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "avgDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDuration" INTEGER,
    "minDuration" INTEGER,
    "p95Duration" INTEGER,
    "p99Duration" INTEGER,
    "lastExecutedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionTemplate" (
    "id" SERIAL NOT NULL,
    "actionType" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "inputSchema" JSONB NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "isBuiltin" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "documentation" TEXT,
    "examples" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingWebhook" (
    "id" TEXT NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "lastReceivedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "events" TEXT[],
    "retryPolicy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomingWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTriggerRule" (
    "id" TEXT NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "conditions" JSONB,
    "passEventAsInput" BOOLEAN NOT NULL DEFAULT true,
    "inputMapping" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTriggerRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "metadata" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowSchedule" (
    "id" TEXT NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "input" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAlert" (
    "id" TEXT NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "notifyTo" TEXT[],
    "notifyMethod" TEXT NOT NULL,
    "notifyWebhook" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastAlertAt" TIMESTAMP(3),
    "alertCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePricing" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePolicy" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "enforced" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSnapshot" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "planId" INTEGER,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "nextRenewalAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationWorkflow_slug_key" ON "AutomationWorkflow"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationWorkflow_webhookUrl_key" ON "AutomationWorkflow"("webhookUrl");

-- CreateIndex
CREATE INDEX "AutomationWorkflow_enabled_idx" ON "AutomationWorkflow"("enabled");

-- CreateIndex
CREATE INDEX "AutomationWorkflow_trigger_idx" ON "AutomationWorkflow"("trigger");

-- CreateIndex
CREATE INDEX "AutomationWorkflow_eventType_idx" ON "AutomationWorkflow"("eventType");

-- CreateIndex
CREATE INDEX "AutomationWorkflow_createdAt_idx" ON "AutomationWorkflow"("createdAt");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_idx" ON "WorkflowRun"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");

-- CreateIndex
CREATE INDEX "WorkflowRun_triggeredBy_idx" ON "WorkflowRun"("triggeredBy");

-- CreateIndex
CREATE INDEX "WorkflowRun_createdAt_idx" ON "WorkflowRun"("createdAt");

-- CreateIndex
CREATE INDEX "WorkflowTaskRun_runId_idx" ON "WorkflowTaskRun"("runId");

-- CreateIndex
CREATE INDEX "WorkflowTaskRun_taskId_idx" ON "WorkflowTaskRun"("taskId");

-- CreateIndex
CREATE INDEX "WorkflowTaskRun_status_idx" ON "WorkflowTaskRun"("status");

-- CreateIndex
CREATE INDEX "RateLimitRule_enabled_idx" ON "RateLimitRule"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitRule_type_target_key" ON "RateLimitRule"("type", "target");

-- CreateIndex
CREATE INDEX "NotificationRule_trigger_idx" ON "NotificationRule"("trigger");

-- CreateIndex
CREATE INDEX "NotificationRule_enabled_idx" ON "NotificationRule"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ActionMetric_actionType_key" ON "ActionMetric"("actionType");

-- CreateIndex
CREATE UNIQUE INDEX "ActionTemplate_actionType_key" ON "ActionTemplate"("actionType");

-- CreateIndex
CREATE INDEX "ActionTemplate_category_idx" ON "ActionTemplate"("category");

-- CreateIndex
CREATE INDEX "ActionTemplate_isActive_idx" ON "ActionTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingWebhook_url_key" ON "IncomingWebhook"("url");

-- CreateIndex
CREATE INDEX "IncomingWebhook_workflowId_idx" ON "IncomingWebhook"("workflowId");

-- CreateIndex
CREATE INDEX "IncomingWebhook_enabled_idx" ON "IncomingWebhook"("enabled");

-- CreateIndex
CREATE INDEX "WorkflowTriggerRule_eventType_idx" ON "WorkflowTriggerRule"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTriggerRule_workflowId_eventType_key" ON "WorkflowTriggerRule"("workflowId", "eventType");

-- CreateIndex
CREATE INDEX "WorkflowEvent_type_idx" ON "WorkflowEvent"("type");

-- CreateIndex
CREATE INDEX "WorkflowEvent_source_idx" ON "WorkflowEvent"("source");

-- CreateIndex
CREATE INDEX "WorkflowEvent_processed_idx" ON "WorkflowEvent"("processed");

-- CreateIndex
CREATE INDEX "WorkflowEvent_createdAt_idx" ON "WorkflowEvent"("createdAt");

-- CreateIndex
CREATE INDEX "WorkflowSchedule_workflowId_idx" ON "WorkflowSchedule"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowSchedule_enabled_idx" ON "WorkflowSchedule"("enabled");

-- CreateIndex
CREATE INDEX "WorkflowAlert_workflowId_idx" ON "WorkflowAlert"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowAlert_condition_idx" ON "WorkflowAlert"("condition");

-- CreateIndex
CREATE INDEX "ServicePlan_serviceId_idx" ON "ServicePlan"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePlan_serviceId_name_key" ON "ServicePlan"("serviceId", "name");

-- CreateIndex
CREATE INDEX "ServicePricing_planId_idx" ON "ServicePricing"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePricing_planId_cycle_key" ON "ServicePricing"("planId", "cycle");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePolicy_planId_key_key" ON "ServicePolicy"("planId", "key");

-- CreateIndex
CREATE INDEX "ServiceSnapshot_serviceId_idx" ON "ServiceSnapshot"("serviceId");

-- CreateIndex
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_nextRenewalAt_idx" ON "Order"("nextRenewalAt");

-- CreateIndex
CREATE INDEX "AuditLog_profileId_idx" ON "AuditLog"("profileId");

-- CreateIndex
CREATE INDEX "Backup_deleted_status_finishedAt_idx" ON "Backup"("deleted", "status", "finishedAt");

-- CreateIndex
CREATE INDEX "Backup_createdById_idx" ON "Backup"("createdById");

-- CreateIndex
CREATE INDEX "Backup_status_idx" ON "Backup"("status");

-- CreateIndex
CREATE INDEX "BackupStepLog_backupId_idx" ON "BackupStepLog"("backupId");

-- CreateIndex
CREATE INDEX "BackupStepLog_status_idx" ON "BackupStepLog"("status");

-- CreateIndex
CREATE INDEX "BackupStepLog_createdAt_idx" ON "BackupStepLog"("createdAt");

-- CreateIndex
CREATE INDEX "BackupVersion_backupId_idx" ON "BackupVersion"("backupId");

-- CreateIndex
CREATE INDEX "BackupVersion_createdAt_idx" ON "BackupVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");

-- CreateIndex
CREATE INDEX "StorageConfig_createdById_idx" ON "StorageConfig"("createdById");

-- CreateIndex
CREATE INDEX "StorageConfig_provider_idx" ON "StorageConfig"("provider");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AutomationProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AutomationTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTaskRun" ADD CONSTRAINT "WorkflowTaskRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingWebhook" ADD CONSTRAINT "IncomingWebhook_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTriggerRule" ADD CONSTRAINT "WorkflowTriggerRule_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSchedule" ADD CONSTRAINT "WorkflowSchedule_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAlert" ADD CONSTRAINT "WorkflowAlert_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePricing" ADD CONSTRAINT "ServicePricing_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePolicy" ADD CONSTRAINT "ServicePolicy_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ServiceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
