-- CreateTable
CREATE TABLE "DomainSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainSetting_key_key" ON "DomainSetting"("key");

-- CreateIndex
CREATE INDEX "DomainSetting_category_idx" ON "DomainSetting"("category");
