-- CreateEnum
CREATE TYPE "ExperienceKind" AS ENUM ('EVENT', 'CHALLENGE', 'RITUAL');

-- AlterTable
ALTER TABLE "experiences" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "kind" "ExperienceKind" NOT NULL DEFAULT 'EVENT';

-- CreateIndex
CREATE INDEX "experiences_kind_idx" ON "experiences"("kind");
