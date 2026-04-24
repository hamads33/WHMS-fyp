-- DropForeignKey
ALTER TABLE "public"."Run" DROP CONSTRAINT "Run_taskId_fkey";

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
