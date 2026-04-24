-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "pluginId" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "lastSuccessAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "durationMs" INTEGER;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "pluginId" TEXT,
ADD COLUMN     "pluginSource" TEXT,
ADD COLUMN     "pluginVersion" TEXT;

-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'user',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plugin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_pluginId_idx" ON "AuditLog"("pluginId");

-- CreateIndex
CREATE INDEX "Task_pluginId_idx" ON "Task"("pluginId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
