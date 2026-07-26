-- AlterTable
ALTER TABLE "experiences" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "experiences_archivedAt_idx" ON "experiences"("archivedAt");
