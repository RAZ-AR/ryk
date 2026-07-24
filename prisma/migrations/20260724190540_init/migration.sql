-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'RU', 'ES');

-- CreateEnum
CREATE TYPE "LifeCategory" AS ENUM ('JOY', 'CONNECTION', 'DISCOVERY', 'MOVEMENT', 'CULTURE', 'NATURE', 'CHALLENGE', 'REST', 'CONTRIBUTION');

-- CreateEnum
CREATE TYPE "SocialMode" AS ENUM ('SOLO', 'CLOSE_ONES', 'NEW_PEOPLE');

-- CreateEnum
CREATE TYPE "OnboardingState" AS ENUM ('NOT_STARTED', 'CATEGORIES', 'SWIPES', 'PARAMS', 'DONE');

-- CreateEnum
CREATE TYPE "PreferenceSentiment" AS ENUM ('LIKE', 'DISLIKE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "PreferenceSource" AS ENUM ('ONBOARDING_CATEGORY', 'ONBOARDING_SWIPE', 'BEHAVIOR', 'EXPLICIT', 'AI_INFERRED');

-- CreateEnum
CREATE TYPE "WishStatus" AS ENUM ('SOMEDAY', 'THIS_MONTH', 'SOON', 'HIDDEN', 'REALIZED');

-- CreateEnum
CREATE TYPE "ExperienceSource" AS ENUM ('WISHLIST', 'CURATED', 'PARTNER', 'AI_GENERATED', 'EVENT_API');

-- CreateEnum
CREATE TYPE "WeeklyStoryStatus" AS ENUM ('SELECTED', 'COMMITTED', 'AT_RISK', 'RESCUED', 'COMPLETED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "BarrierType" AS ENUM ('WEATHER', 'NO_ENERGY', 'TOO_EXPENSIVE', 'NOT_ALONE', 'CHANGED_MIND');

-- CreateEnum
CREATE TYPE "Emotion" AS ENUM ('DELIGHT', 'CALM', 'PRIDE', 'CLOSENESS');

-- CreateEnum
CREATE TYPE "InterventionType" AS ENUM ('NUDGE', 'PLANNING', 'BARRIER_PROMPT', 'RESCUE', 'CHECK_IN');

-- CreateEnum
CREATE TYPE "InterventionOutcome" AS ENUM ('PENDING', 'ACTED', 'IGNORED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'RU',
    "city" TEXT,
    "radiusKm" INTEGER NOT NULL DEFAULT 30,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Belgrade',
    "onboardingState" "OnboardingState" NOT NULL DEFAULT 'NOT_STARTED',
    "budgetMax" INTEGER,
    "socialMode" "SocialMode",
    "noveltyRatio" INTEGER NOT NULL DEFAULT 30,
    "notificationPreferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "LifeCategory" NOT NULL,
    "entity" TEXT,
    "sentiment" "PreferenceSentiment" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "source" "PreferenceSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" "LifeCategory",
    "budget" INTEGER,
    "season" TEXT,
    "socialMode" "SocialMode",
    "status" "WishStatus" NOT NULL DEFAULT 'SOMEDAY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "source" "ExperienceSource" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "LifeCategory" NOT NULL,
    "city" TEXT,
    "location" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "startTime" TIMESTAMP(3),
    "durationMin" INTEGER,
    "price" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "bookingUrl" TEXT,
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_stories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienceId" TEXT,
    "wishId" TEXT,
    "weekStart" DATE NOT NULL,
    "status" "WeeklyStoryStatus" NOT NULL DEFAULT 'SELECTED',
    "whyExplanation" TEXT,
    "plannedFor" TIMESTAMP(3),
    "budget" INTEGER,
    "socialMode" "SocialMode",
    "companionName" TEXT,
    "witnessName" TEXT,
    "barrier" "BarrierType",
    "barrierState" JSONB NOT NULL DEFAULT '{}',
    "commitment" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memories" (
    "id" TEXT NOT NULL,
    "weeklyStoryId" TEXT NOT NULL,
    "rating" INTEGER,
    "emotion" "Emotion",
    "note" TEXT,
    "media" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "companion" TEXT,
    "completedAt" TIMESTAMP(3),
    "deferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interventions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weeklyStoryId" TEXT,
    "type" "InterventionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "outcome" "InterventionOutcome" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interventions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");

-- CreateIndex
CREATE INDEX "preferences_userId_idx" ON "preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "preferences_userId_category_entity_key" ON "preferences"("userId", "category", "entity");

-- CreateIndex
CREATE INDEX "wishes_userId_status_idx" ON "wishes"("userId", "status");

-- CreateIndex
CREATE INDEX "experiences_city_category_idx" ON "experiences"("city", "category");

-- CreateIndex
CREATE INDEX "experiences_startTime_idx" ON "experiences"("startTime");

-- CreateIndex
CREATE INDEX "weekly_stories_userId_status_idx" ON "weekly_stories"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_stories_userId_weekStart_key" ON "weekly_stories"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "memories_weeklyStoryId_key" ON "memories"("weeklyStoryId");

-- CreateIndex
CREATE INDEX "interventions_userId_sentAt_idx" ON "interventions"("userId", "sentAt");

-- AddForeignKey
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_stories" ADD CONSTRAINT "weekly_stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_stories" ADD CONSTRAINT "weekly_stories_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_stories" ADD CONSTRAINT "weekly_stories_wishId_fkey" FOREIGN KEY ("wishId") REFERENCES "wishes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_weeklyStoryId_fkey" FOREIGN KEY ("weeklyStoryId") REFERENCES "weekly_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_weeklyStoryId_fkey" FOREIGN KEY ("weeklyStoryId") REFERENCES "weekly_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
