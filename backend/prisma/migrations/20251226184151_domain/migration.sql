/*
  Warnings:

  - You are about to drop the column `providerId` on the `DNSRecord` table. All the data in the column will be lost.
  - You are about to drop the column `deleted` on the `Domain` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Domain` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `Domain` table. All the data in the column will be lost.
  - The `status` column on the `Domain` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `ownerId` to the `Domain` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('pending_registration', 'active', 'expired', 'grace', 'redemption', 'transfer_pending', 'transfer_failed', 'transferred_out', 'cancelled');

-- CreateEnum
CREATE TYPE "DomainContactType" AS ENUM ('registrant', 'admin', 'tech', 'billing');

-- CreateEnum
CREATE TYPE "DomainTransferStatus" AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- DropForeignKey
ALTER TABLE "DNSRecord" DROP CONSTRAINT "DNSRecord_domainId_fkey";

-- DropForeignKey
ALTER TABLE "DomainLog" DROP CONSTRAINT "DomainLog_domainId_fkey";

-- AlterTable
ALTER TABLE "DNSRecord" DROP COLUMN "providerId",
ADD COLUMN     "providerRecordId" TEXT;

-- AlterTable
ALTER TABLE "Domain" DROP COLUMN "deleted",
DROP COLUMN "deletedAt",
DROP COLUMN "provider",
ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "providerConfigId" INTEGER,
ADD COLUMN     "registrar" TEXT,
ADD COLUMN     "registrationPrice" INTEGER,
ADD COLUMN     "renewalPrice" INTEGER,
DROP COLUMN "status",
ADD COLUMN     "status" "DomainStatus" NOT NULL DEFAULT 'pending_registration';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "DomainContact" (
    "id" SERIAL NOT NULL,
    "domainId" INTEGER NOT NULL,
    "type" "DomainContactType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainTransfer" (
    "id" SERIAL NOT NULL,
    "domainId" INTEGER NOT NULL,
    "authCode" TEXT NOT NULL,
    "status" "DomainTransferStatus" NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "providerResponse" JSONB,

    CONSTRAINT "DomainTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainRegistrarCommand" (
    "id" SERIAL NOT NULL,
    "domainId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "request" JSONB,
    "response" JSONB,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainRegistrarCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TldPricing" (
    "id" SERIAL NOT NULL,
    "tld" TEXT NOT NULL,
    "registration" DECIMAL(10,2) NOT NULL,
    "renewal" DECIMAL(10,2) NOT NULL,
    "transfer" DECIMAL(10,2) NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TldPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainContact_domainId_type_key" ON "DomainContact"("domainId", "type");

-- CreateIndex
CREATE INDEX "DomainTransfer_status_idx" ON "DomainTransfer"("status");

-- CreateIndex
CREATE INDEX "DomainRegistrarCommand_domainId_idx" ON "DomainRegistrarCommand"("domainId");

-- CreateIndex
CREATE INDEX "DomainRegistrarCommand_action_idx" ON "DomainRegistrarCommand"("action");

-- CreateIndex
CREATE UNIQUE INDEX "TldPricing_tld_key" ON "TldPricing"("tld");

-- CreateIndex
CREATE INDEX "DNSRecord_domainId_idx" ON "DNSRecord"("domainId");

-- CreateIndex
CREATE INDEX "Domain_ownerId_idx" ON "Domain"("ownerId");

-- CreateIndex
CREATE INDEX "Domain_status_idx" ON "Domain"("status");

-- CreateIndex
CREATE INDEX "Domain_expiryDate_idx" ON "Domain"("expiryDate");

-- CreateIndex
CREATE INDEX "DomainLog_domainId_idx" ON "DomainLog"("domainId");

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "ProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainContact" ADD CONSTRAINT "DomainContact_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainTransfer" ADD CONSTRAINT "DomainTransfer_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DNSRecord" ADD CONSTRAINT "DNSRecord_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainRegistrarCommand" ADD CONSTRAINT "DomainRegistrarCommand_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainLog" ADD CONSTRAINT "DomainLog_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
