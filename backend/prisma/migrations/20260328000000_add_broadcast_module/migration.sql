-- Create Broadcast enums
CREATE TYPE "BroadcastType" AS ENUM ('NOTIFICATION', 'DOCUMENT');
CREATE TYPE "BroadcastTarget" AS ENUM ('ALL', 'CLIENTS', 'STAFF', 'DEVELOPERS', 'SPECIFIC_USERS');
CREATE TYPE "BroadcastSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "EngagementAction" AS ENUM ('VIEW', 'DISMISS', 'DOWNLOAD');

-- Create Broadcast table
CREATE TABLE "Broadcast" (
  "id" SERIAL NOT NULL,
  "type" "BroadcastType" NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "fileKey" TEXT,
  "fileOriginalName" TEXT,
  "fileMimeType" TEXT,
  "fileSize" INTEGER,
  "targetAudience" "BroadcastTarget" NOT NULL DEFAULT 'ALL',
  "targetUserIds" JSONB,
  "severity" "BroadcastSeverity" NOT NULL DEFAULT 'INFO',
  "isDismissible" BOOLEAN NOT NULL DEFAULT true,
  "publishAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- Create Broadcast indexes
CREATE INDEX "Broadcast_type_idx" ON "Broadcast"("type");
CREATE INDEX "Broadcast_targetAudience_idx" ON "Broadcast"("targetAudience");
CREATE INDEX "Broadcast_publishAt_idx" ON "Broadcast"("publishAt");
CREATE INDEX "Broadcast_expiresAt_idx" ON "Broadcast"("expiresAt");
CREATE INDEX "Broadcast_isActive_idx" ON "Broadcast"("isActive");

-- Create Broadcast foreign key
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create BroadcastDismissal table
CREATE TABLE "BroadcastDismissal" (
  "id" SERIAL NOT NULL,
  "broadcastId" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BroadcastDismissal_pkey" PRIMARY KEY ("id")
);

-- Create BroadcastDismissal unique constraint and indexes
CREATE UNIQUE INDEX "BroadcastDismissal_broadcastId_userId_key" ON "BroadcastDismissal"("broadcastId", "userId");
CREATE INDEX "BroadcastDismissal_userId_idx" ON "BroadcastDismissal"("userId");

-- Create BroadcastDismissal foreign keys
ALTER TABLE "BroadcastDismissal" ADD CONSTRAINT "BroadcastDismissal_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastDismissal" ADD CONSTRAINT "BroadcastDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create BroadcastEngagement table
CREATE TABLE "BroadcastEngagement" (
  "id" SERIAL NOT NULL,
  "broadcastId" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "action" "EngagementAction" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BroadcastEngagement_pkey" PRIMARY KEY ("id")
);

-- Create BroadcastEngagement indexes
CREATE INDEX "BroadcastEngagement_broadcastId_idx" ON "BroadcastEngagement"("broadcastId");
CREATE INDEX "BroadcastEngagement_userId_idx" ON "BroadcastEngagement"("userId");
CREATE INDEX "BroadcastEngagement_action_idx" ON "BroadcastEngagement"("action");

-- Create BroadcastEngagement foreign keys
ALTER TABLE "BroadcastEngagement" ADD CONSTRAINT "BroadcastEngagement_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastEngagement" ADD CONSTRAINT "BroadcastEngagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
