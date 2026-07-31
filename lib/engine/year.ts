import type { LifeCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/*
 * «Год» — из чего сложился год в историях.
 *
 * Сознательно НЕ Life Balance в виде радара с целевыми значениями: колесо
 * с «идеальным балансом» — это счёт, за счётом приходит стыд, а счётчики
 * стыда у нас в запрещённых паттернах (17-design-system).
 *
 * Два отличия от того, что обычно рисуют:
 *
 *  1. Показываем только прожитое. Категории с нулём не выводим вовсе —
 *     девять полосок, из которых три пустые, читаются как список дел,
 *     который надо закрыть. Пустых мест, просящих себя заполнить, здесь нет.
 *
 *  2. Никаких процентов и целей. Длина полосы относительна самой большой
 *     полосе, и всё. «Мало природы» — вывод, который человек может сделать
 *     сам; мы его не произносим.
 *
 * Перенесённые недели не считаем: их не было. Но и не показываем как
 * недостачу — их место в архиве, отдельным кадром.
 */

export type YearRow = {
  category: LifeCategory;
  count: number;
  /** Доля от самой большой полосы, 0..1 — только для ширины в UI. */
  share: number;
};

export type YearView = {
  year: number;
  /** Сколько историй прожито за год. */
  total: number;
  /** Только непустые категории, от большей к меньшей. */
  rows: YearRow[];
  /** Чего было больше всего. null, если год ещё пустой. */
  top: LifeCategory | null;
};

export async function getYear(userId: string, now: Date = new Date()): Promise<YearView> {
  const year = now.getUTCFullYear();
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));

  const stories = await prisma.weeklyStory.findMany({
    where: {
      userId,
      weekStart: { gte: from, lt: to },
      // Прожитое — это истории с воспоминанием, которое не помечено переносом.
      memory: { is: { deferred: false } },
    },
    select: { experience: { select: { category: true } } },
  });

  const counts = new Map<LifeCategory, number>();
  for (const s of stories) {
    const category = s.experience?.category;
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const max = Math.max(0, ...counts.values());
  const rows: YearRow[] = [...counts.entries()]
    .map(([category, count]) => ({ category, count, share: max > 0 ? count / max : 0 }))
    // При равенстве — по алфавиту, чтобы порядок не прыгал между запросами.
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  return {
    year,
    total: stories.length,
    rows,
    top: rows[0]?.category ?? null,
  };
}
