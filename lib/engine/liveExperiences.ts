import type { Prisma } from "@/generated/prisma/client";

/*
 * Что вообще можно показывать пользователю — общее правило для недельных
 * кандидатов и для ленты свайпов. Вынесено, чтобы условия не разъехались:
 * раньше они жили только в getWeeklyView, и лента легко начала бы предлагать
 * снятое куратором или прошедшее.
 */

/** Начало сегодняшнего дня в UTC — граница «событие ещё впереди». */
export function startOfTodayUTC(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * «Живое» впечатление: не снято куратором (ADR-006) и не с прошедшей датой.
 * Впечатления без даты (прогулка, музей) живут всегда.
 */
export function liveExperienceWhere(now: Date = new Date()): Prisma.ExperienceWhereInput {
  return {
    archivedAt: null,
    OR: [{ startTime: null }, { startTime: { gte: startOfTodayUTC(now) } }],
  };
}
