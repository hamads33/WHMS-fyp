CREATE TABLE "Website" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Website_userId_idx" ON "Website"("userId");
CREATE INDEX "Website_status_idx" ON "Website"("status");

ALTER TABLE "Website"
ADD CONSTRAINT "Website_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
