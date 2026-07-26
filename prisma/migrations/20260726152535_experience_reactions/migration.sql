-- CreateTable
CREATE TABLE "experience_reactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "liked" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experience_reactions_userId_liked_idx" ON "experience_reactions"("userId", "liked");

-- CreateIndex
CREATE UNIQUE INDEX "experience_reactions_userId_experienceId_key" ON "experience_reactions"("userId", "experienceId");

-- AddForeignKey
ALTER TABLE "experience_reactions" ADD CONSTRAINT "experience_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_reactions" ADD CONSTRAINT "experience_reactions_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
