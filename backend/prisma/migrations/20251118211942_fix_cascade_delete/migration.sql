-- DropForeignKey
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_profileId_fkey";

-- DropIndex
DROP INDEX "public"."Task_pluginId_idx";

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
