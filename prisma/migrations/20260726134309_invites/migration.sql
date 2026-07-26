-- CreateEnum
CREATE TYPE "InviteRole" AS ENUM ('COMPANION', 'WITNESS');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "weeklyStoryId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "role" "InviteRole" NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "inviterName" TEXT NOT NULL,
    "inviterUsername" TEXT,
    "recipientId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invites_recipientId_status_idx" ON "invites"("recipientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invites_weeklyStoryId_role_key" ON "invites"("weeklyStoryId", "role");

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_weeklyStoryId_fkey" FOREIGN KEY ("weeklyStoryId") REFERENCES "weekly_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
