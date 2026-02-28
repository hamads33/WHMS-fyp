-- DropForeignKey
ALTER TABLE "AutomationRun" DROP CONSTRAINT "AutomationRun_profileId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationRun" DROP CONSTRAINT "AutomationRun_taskId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationTask" DROP CONSTRAINT "AutomationTask_profileId_fkey";

-- DropForeignKey
ALTER TABLE "BackupStepLog" DROP CONSTRAINT "BackupStepLog_backupId_fkey";

-- DropForeignKey
ALTER TABLE "BackupVersion" DROP CONSTRAINT "BackupVersion_backupId_fkey";

-- DropForeignKey
ALTER TABLE "DNSRecord" DROP CONSTRAINT "DNSRecord_domainId_fkey";

-- DropForeignKey
ALTER TABLE "Domain" DROP CONSTRAINT "Domain_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Domain" DROP CONSTRAINT "Domain_providerConfigId_fkey";

-- DropForeignKey
ALTER TABLE "DomainContact" DROP CONSTRAINT "DomainContact_domainId_fkey";

-- DropForeignKey
ALTER TABLE "DomainLog" DROP CONSTRAINT "DomainLog_domainId_fkey";

-- DropForeignKey
ALTER TABLE "DomainRegistrarCommand" DROP CONSTRAINT "DomainRegistrarCommand_domainId_fkey";

-- DropForeignKey
ALTER TABLE "DomainTransfer" DROP CONSTRAINT "DomainTransfer_domainId_fkey";

-- DropForeignKey
ALTER TABLE "EmailJob" DROP CONSTRAINT "EmailJob_templateId_fkey";

-- DropForeignKey
ALTER TABLE "IncomingWebhook" DROP CONSTRAINT "IncomingWebhook_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceAnalytics" DROP CONSTRAINT "MarketplaceAnalytics_productId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceAnalytics" DROP CONSTRAINT "MarketplaceAnalytics_versionId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceDependency" DROP CONSTRAINT "MarketplaceDependency_productId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceLicenseActivation" DROP CONSTRAINT "MarketplaceLicenseActivation_licenseId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceProduct" DROP CONSTRAINT "MarketplaceProduct_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceProduct" DROP CONSTRAINT "MarketplaceProduct_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplacePurchase" DROP CONSTRAINT "MarketplacePurchase_productId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplacePurchase" DROP CONSTRAINT "MarketplacePurchase_versionId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceSubmission" DROP CONSTRAINT "MarketplaceSubmission_productId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceSubmission" DROP CONSTRAINT "MarketplaceSubmission_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceSubmission" DROP CONSTRAINT "MarketplaceSubmission_versionId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceVerification" DROP CONSTRAINT "MarketplaceVerification_productId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceVerification" DROP CONSTRAINT "MarketplaceVerification_versionId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceVersion" DROP CONSTRAINT "MarketplaceVersion_productId_fkey";

-- DropForeignKey
ALTER TABLE "ServicePlan" DROP CONSTRAINT "ServicePlan_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "ServicePolicy" DROP CONSTRAINT "ServicePolicy_planId_fkey";

-- DropForeignKey
ALTER TABLE "ServicePricing" DROP CONSTRAINT "ServicePricing_planId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_clientId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookLog" DROP CONSTRAINT "WebhookLog_webhookId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowAlert" DROP CONSTRAINT "WorkflowAlert_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowRun" DROP CONSTRAINT "WorkflowRun_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowSchedule" DROP CONSTRAINT "WorkflowSchedule_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowTaskRun" DROP CONSTRAINT "WorkflowTaskRun_runId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowTriggerRule" DROP CONSTRAINT "WorkflowTriggerRule_workflowId_fkey";

-- DropIndex
DROP INDEX "AutomationProfile_cron_idx";

-- DropIndex
DROP INDEX "AutomationProfile_enabled_idx";

-- DropIndex
DROP INDEX "AutomationProfile_name_key";

-- DropIndex
DROP INDEX "AutomationTask_order_idx";

-- DropIndex
DROP INDEX "AutomationTask_profileId_idx";

-- DropIndex
DROP INDEX "Domain_expiryDate_idx";

-- DropIndex
DROP INDEX "Domain_name_key";

-- DropIndex
DROP INDEX "Domain_ownerId_idx";

-- DropIndex
DROP INDEX "Domain_status_idx";

-- DropIndex
DROP INDEX "MarketplaceProduct_slug_key";

-- DropIndex
DROP INDEX "MarketplacePurchase_licenseKey_key";

-- DropIndex
DROP INDEX "RefreshToken_userId_idx";

-- DropIndex
DROP INDEX "ServicePlan_serviceId_name_key";

-- DropIndex
DROP INDEX "Ticket_clientId_idx";

-- AlterTable
ALTER TABLE "AutomationProfile" DROP COLUMN "cron",
DROP COLUMN "enabled",
ADD COLUMN     "actions" TEXT[],
ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "triggerEvent" TEXT NOT NULL,
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "AutomationTask" DROP CONSTRAINT "AutomationTask_pkey",
DROP COLUMN "actionMeta",
DROP COLUMN "actionType",
DROP COLUMN "order",
DROP COLUMN "profileId",
DROP COLUMN "updatedAt",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "AutomationTask_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AutomationTask_id_seq";

-- AlterTable
ALTER TABLE "Domain" DROP CONSTRAINT "Domain_pkey",
DROP COLUMN "autoRenew",
DROP COLUMN "currency",
DROP COLUMN "expiryDate",
DROP COLUMN "metadata",
DROP COLUMN "name",
DROP COLUMN "nameservers",
DROP COLUMN "ownerId",
DROP COLUMN "providerConfigId",
DROP COLUMN "registrar",
DROP COLUMN "registrationPrice",
DROP COLUMN "renewalPrice",
ADD COLUMN     "domain" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD CONSTRAINT "Domain_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Domain_id_seq";

-- AlterTable
ALTER TABLE "MarketplaceProduct" DROP COLUMN "approvedAt",
DROP COLUMN "categoryId",
DROP COLUMN "documentation",
DROP COLUMN "downloadCount",
DROP COLUMN "installCount",
DROP COLUMN "lastUpdatedAt",
DROP COLUMN "logo",
DROP COLUMN "longDesc",
DROP COLUMN "ratingAvg",
DROP COLUMN "ratingCount",
DROP COLUMN "rejectReason",
DROP COLUMN "screenshots",
DROP COLUMN "sellerId",
DROP COLUMN "shortDesc",
DROP COLUMN "slug",
DROP COLUMN "status",
DROP COLUMN "tags",
DROP COLUMN "title",
DROP COLUMN "updatedAt",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "devId" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rating" DECIMAL(3,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MarketplacePurchase" DROP COLUMN "activationLimit",
DROP COLUMN "expiresAt",
DROP COLUMN "licenseKey",
DROP COLUMN "productId",
DROP COLUMN "revoked",
DROP COLUMN "subscribed",
DROP COLUMN "versionId",
ADD COLUMN     "data" JSONB;

-- AlterTable
ALTER TABLE "MarketplaceReview" DROP COLUMN "review",
DROP COLUMN "stability",
ADD COLUMN     "text" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "MarketplaceSubmission" DROP COLUMN "notes",
DROP COLUMN "productId",
DROP COLUMN "reviewerId",
DROP COLUMN "versionId",
ADD COLUMN     "json" JSONB,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "provisioningError" TEXT,
ADD COLUMN     "provisioningStatus" TEXT;

-- AlterTable
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_pkey",
DROP COLUMN "revoked",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RefreshToken_id_seq";

-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ServicePlan" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "ServicePolicy" DROP COLUMN "enforced",
ALTER COLUMN "value" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_pkey",
DROP COLUMN "clientId",
DROP COLUMN "message",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "ticketCode" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "priority" SET DEFAULT 'normal',
ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Ticket_id_seq";

-- DropTable
DROP TABLE "ActionMetric";

-- DropTable
DROP TABLE "ActionTemplate";

-- DropTable
DROP TABLE "AutomationRun";

-- DropTable
DROP TABLE "AutomationWorkflow";

-- DropTable
DROP TABLE "Backup";

-- DropTable
DROP TABLE "BackupStepLog";

-- DropTable
DROP TABLE "BackupVersion";

-- DropTable
DROP TABLE "DNSRecord";

-- DropTable
DROP TABLE "DomainContact";

-- DropTable
DROP TABLE "DomainLog";

-- DropTable
DROP TABLE "DomainRegistrarCommand";

-- DropTable
DROP TABLE "DomainTransfer";

-- DropTable
DROP TABLE "EmailEvent";

-- DropTable
DROP TABLE "EmailJob";

-- DropTable
DROP TABLE "EmailTemplate";

-- DropTable
DROP TABLE "IncomingWebhook";

-- DropTable
DROP TABLE "IpAccessRule";

-- DropTable
DROP TABLE "MarketplaceActiveInstance";

-- DropTable
DROP TABLE "MarketplaceAnalytics";

-- DropTable
DROP TABLE "MarketplaceAnalyticsAggregate";

-- DropTable
DROP TABLE "MarketplaceBuildLog";

-- DropTable
DROP TABLE "MarketplaceCategory";

-- DropTable
DROP TABLE "MarketplaceCrash";

-- DropTable
DROP TABLE "MarketplaceDependency";

-- DropTable
DROP TABLE "MarketplaceLicenseActivation";

-- DropTable
DROP TABLE "MarketplacePerfMetric";

-- DropTable
DROP TABLE "MarketplaceVerification";

-- DropTable
DROP TABLE "MarketplaceVersion";

-- DropTable
DROP TABLE "MarketplaceWebhook";

-- DropTable
DROP TABLE "MarketplaceWebhookEndpoint";

-- DropTable
DROP TABLE "NotificationRule";

-- DropTable
DROP TABLE "ProviderConfig";

-- DropTable
DROP TABLE "RateLimitRule";

-- DropTable
DROP TABLE "StorageConfig";

-- DropTable
DROP TABLE "Tld";

-- DropTable
DROP TABLE "TldPricing";

-- DropTable
DROP TABLE "Webhook";

-- DropTable
DROP TABLE "WebhookLog";

-- DropTable
DROP TABLE "WorkflowAlert";

-- DropTable
DROP TABLE "WorkflowEvent";

-- DropTable
DROP TABLE "WorkflowRun";

-- DropTable
DROP TABLE "WorkflowSchedule";

-- DropTable
DROP TABLE "WorkflowTaskRun";

-- DropTable
DROP TABLE "WorkflowTriggerRule";

-- DropEnum
DROP TYPE "AutomationRunStatus";

-- DropEnum
DROP TYPE "DomainContactType";

-- DropEnum
DROP TYPE "DomainStatus";

-- DropEnum
DROP TYPE "DomainTransferStatus";

-- DropEnum
DROP TYPE "IpRuleType";

-- DropEnum
DROP TYPE "MarketplaceSubmissionStatus";

-- DropEnum
DROP TYPE "WorkflowRunStatus";

-- DropEnum
DROP TYPE "WorkflowTaskStatus";

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketReply" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceFeatureList" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "feature" TEXT NOT NULL,
    "quantity" TEXT,
    "unlimited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceFeatureList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingAccount" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "controlPanel" TEXT NOT NULL DEFAULT 'vestacp',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "suspendReason" TEXT,
    "provisionedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "diskUsedMB" INTEGER,
    "bandwidthUsedGB" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingDomain" (
    "id" TEXT NOT NULL,
    "hostingAccountId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sslStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingEmail" (
    "id" TEXT NOT NULL,
    "hostingAccountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "quota" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingDatabase" (
    "id" TEXT NOT NULL,
    "hostingAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dbUser" TEXT NOT NULL,
    "dbPassword" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'mysql',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostingDatabase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_event_idx" ON "WebhookEvent"("event");

-- CreateIndex
CREATE INDEX "TicketReply_ticketId_idx" ON "TicketReply"("ticketId");

-- CreateIndex
CREATE INDEX "ServiceFeatureList_planId_idx" ON "ServiceFeatureList"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "HostingAccount_orderId_key" ON "HostingAccount"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "HostingAccount_username_key" ON "HostingAccount"("username");

-- CreateIndex
CREATE INDEX "HostingAccount_clientId_idx" ON "HostingAccount"("clientId");

-- CreateIndex
CREATE INDEX "HostingAccount_orderId_idx" ON "HostingAccount"("orderId");

-- CreateIndex
CREATE INDEX "HostingAccount_status_idx" ON "HostingAccount"("status");

-- CreateIndex
CREATE INDEX "HostingDomain_hostingAccountId_idx" ON "HostingDomain"("hostingAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "HostingDomain_hostingAccountId_domain_key" ON "HostingDomain"("hostingAccountId", "domain");

-- CreateIndex
CREATE INDEX "HostingEmail_hostingAccountId_idx" ON "HostingEmail"("hostingAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "HostingEmail_hostingAccountId_email_key" ON "HostingEmail"("hostingAccountId", "email");

-- CreateIndex
CREATE INDEX "HostingDatabase_hostingAccountId_idx" ON "HostingDatabase"("hostingAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "HostingDatabase_hostingAccountId_name_key" ON "HostingDatabase"("hostingAccountId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_domain_key" ON "Domain"("domain");

-- CreateIndex
CREATE INDEX "Domain_userId_idx" ON "Domain"("userId");

-- CreateIndex
CREATE INDEX "MarketplacePurchase_userId_idx" ON "MarketplacePurchase"("userId");

-- CreateIndex
CREATE INDEX "MarketplaceReview_userId_idx" ON "MarketplaceReview"("userId");

-- CreateIndex
CREATE INDEX "MarketplaceReview_productId_idx" ON "MarketplaceReview"("productId");

-- CreateIndex
CREATE INDEX "MarketplaceSubmission_userId_idx" ON "MarketplaceSubmission"("userId");

-- CreateIndex
CREATE INDEX "ServicePlan_active_idx" ON "ServicePlan"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketCode_key" ON "Ticket"("ticketCode");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_devId_fkey" FOREIGN KEY ("devId") REFERENCES "DeveloperProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceSubmission" ADD CONSTRAINT "MarketplaceSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePricing" ADD CONSTRAINT "ServicePricing_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceFeatureList" ADD CONSTRAINT "ServiceFeatureList_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePolicy" ADD CONSTRAINT "ServicePolicy_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingAccount" ADD CONSTRAINT "HostingAccount_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingAccount" ADD CONSTRAINT "HostingAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingDomain" ADD CONSTRAINT "HostingDomain_hostingAccountId_fkey" FOREIGN KEY ("hostingAccountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingEmail" ADD CONSTRAINT "HostingEmail_hostingAccountId_fkey" FOREIGN KEY ("hostingAccountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingDatabase" ADD CONSTRAINT "HostingDatabase_hostingAccountId_fkey" FOREIGN KEY ("hostingAccountId") REFERENCES "HostingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

