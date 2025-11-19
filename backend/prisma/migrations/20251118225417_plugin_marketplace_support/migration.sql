-- AlterTable
ALTER TABLE "Plugin" ADD COLUMN     "author" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "hash" TEXT,
ADD COLUMN     "homepage" TEXT,
ADD COLUMN     "iconUrl" TEXT,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "marketplaceUrl" TEXT;
