-- CreateEnum
CREATE TYPE "LifeBarrier" AS ENUM ('NO_TIME', 'TOO_EXPENSIVE', 'NO_COMPANY', 'FEAR', 'NO_ENERGY');

-- CreateEnum
CREATE TYPE "FreeWindow" AS ENUM ('WEEKDAY_MORNING', 'WEEKDAY_EVENING', 'WEEKEND_DAY', 'WEEKEND_EVENING');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "freeWindows" "FreeWindow"[],
ADD COLUMN     "mainBarrier" "LifeBarrier";
