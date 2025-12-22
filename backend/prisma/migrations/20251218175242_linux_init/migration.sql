/*
  Warnings:

  - The primary key for the `AuditLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `category` on the `MarketplaceProduct` table. All the data in the column will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClientService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MarketplaceSeller` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Service` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `AutomationProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pluginId,key]` on the table `PluginSetting` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,roleId]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `actor` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `AutomationRun` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `DeveloperProfile` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `MarketplaceSubmission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('pending', 'running', 'success', 'failed');

-- CreateEnum
CREATE TYPE "MarketplaceSubmissionStatus" AS ENUM ('pending_review', 'pending_dependency_approval', 'pending_resubmission', 'rejected', 'auto_rejected', 'approved');

-- DropForeignKey
ALTER TABLE "ClientService" DROP CONSTRAINT "ClientService_clientId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceProduct" DROP CONSTRAINT "MarketplaceProduct_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceSeller" DROP CONSTRAINT "MarketplaceSeller_userId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_clientId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_pkey",
ADD COLUMN     "actor" TEXT NOT NULL,
ADD COLUMN     "level" TEXT NOT NULL DEFAULT 'INFO',
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "source" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "AutomationRun" DROP COLUMN "status",
ADD COLUMN     "status" "AutomationRunStatus" NOT NULL;

-- AlterTable
ALTER TABLE "DeveloperProfile" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "marketplaceMeta" JSONB,
ADD COLUMN     "publicKeyPem" TEXT,
ADD COLUMN     "storeName" TEXT,
ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "MarketplaceDependency" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MarketplaceProduct" DROP COLUMN "category",
ALTER COLUMN "approvedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MarketplaceSubmission" DROP COLUMN "status",
ADD COLUMN     "status" "MarketplaceSubmissionStatus" NOT NULL;

-- AlterTable
ALTER TABLE "MarketplaceVersion" ADD COLUMN     "approvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Plugin" ADD COLUMN     "configSchema" JSONB,
ADD COLUMN     "type" TEXT DEFAULT 'ui';

-- DropTable
DROP TABLE "Client";

-- DropTable
DROP TABLE "ClientService";

-- DropTable
DROP TABLE "MarketplaceSeller";

-- DropTable
DROP TABLE "Service";

-- CreateTable
CREATE TABLE "StorageConfig" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storageConfigId" INTEGER,
    "filePath" TEXT,
    "sizeBytes" BIGINT,
    "status" TEXT NOT NULL,
    "retentionDays" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupVersion" (
    "id" TEXT NOT NULL,
    "backupId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "filePath" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupStepLog" (
    "id" TEXT NOT NULL,
    "backupId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "meta" JSONB,
    "status" TEXT NOT NULL DEFAULT 'started',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupStepLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationProfile_enabled_idx" ON "AutomationProfile"("enabled");

-- CreateIndex
CREATE INDEX "AutomationProfile_cron_idx" ON "AutomationProfile"("cron");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationProfile_name_key" ON "AutomationProfile"("name");

-- CreateIndex
CREATE INDEX "AutomationRun_status_idx" ON "AutomationRun"("status");

-- CreateIndex
CREATE INDEX "AutomationRun_createdAt_idx" ON "AutomationRun"("createdAt");

-- CreateIndex
CREATE INDEX "AutomationTask_profileId_idx" ON "AutomationTask"("profileId");

-- CreateIndex
CREATE INDEX "AutomationTask_order_idx" ON "AutomationTask"("order");

-- CreateIndex
CREATE UNIQUE INDEX "PluginSetting_pluginId_key_key" ON "PluginSetting"("pluginId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupVersion" ADD CONSTRAINT "BackupVersion_backupId_fkey" FOREIGN KEY ("backupId") REFERENCES "Backup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupStepLog" ADD CONSTRAINT "BackupStepLog_backupId_fkey" FOREIGN KEY ("backupId") REFERENCES "Backup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "DeveloperProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
