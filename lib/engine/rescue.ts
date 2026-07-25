import type { BarrierType, LifeCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/*
 * Rescue Mission (PRD 5.7, Flow F).
 *
 * Когда план срывается, продукт не фиксирует провал, а предлагает 2–3
 * варианта МЕНЬШЕГО масштаба под ту же потребность. Барьер задаёт, что
 * считать «меньше»: нет сил — короче, дорого — дешевле, погода — под крышей.
 *
 * Это не наказание и не «ты не справился» — это спасение недели.
 */

export type RescueOption = {
  experienceId: string;
  title: string;
  category: LifeCategory;
  price: number | null;
  currency: string;
  durationMin: number | null;
  location: string | null;
};

/** Категории, которые обычно проходят под крышей — на случай непогоды. */
const INDOOR: ReadonlyArray<LifeCategory> = ["CULTURE", "JOY", "REST", "CONNECTION"];

export async function getRescueOptions(input: {
  userId: string;
  barrier: BarrierType;
  /** Текущая история — чтобы предложить именно что-то меньше её. */
  currentExperienceId: string | null;
  currentPrice: number | null;
  currentDurationMin: number | null;
  currentCategory: LifeCategory | null;
}): Promise<RescueOption[]> {
  const { barrier, currentExperienceId, currentPrice, currentDurationMin, currentCategory } = input;

  const all = await prisma.experience.findMany({ take: 50 });
  const pool = all.filter((e) => e.id !== currentExperienceId);

  const scored = pool
    .map((e) => {
      let score = 0;

      // Барьер решает, что делает вариант «спасательным».
      switch (barrier) {
        case "WEATHER":
          if (INDOOR.includes(e.category)) score += 3;
          break;
        case "NO_ENERGY":
          if (e.durationMin != null && e.durationMin <= 90) score += 3;
          if (currentDurationMin != null && (e.durationMin ?? 0) < currentDurationMin) score += 1;
          break;
        case "TOO_EXPENSIVE":
          if ((e.price ?? 0) === 0) score += 3;
          else if (currentPrice != null && (e.price ?? 0) < currentPrice) score += 2;
          break;
        case "NOT_ALONE":
          if (e.category === "CONNECTION") score += 3;
          break;
        case "CHANGED_MIND":
          // Хочется другого — уводим от прежней категории.
          if (currentCategory && e.category !== currentCategory) score += 2;
          break;
      }

      // Общее правило спасения: короче и дешевле исходного плана.
      if (currentDurationMin != null && (e.durationMin ?? 0) < currentDurationMin) score += 1;
      if (currentPrice != null && (e.price ?? 0) < currentPrice) score += 1;

      return { e, score };
    })
    .sort((a, b) => b.score - a.score);

  // Разные категории — чтобы три варианта не были одним и тем же.
  const picked: typeof scored = [];
  const used = new Set<LifeCategory>();
  for (const s of scored) {
    if (picked.length >= 3) break;
    if (used.has(s.e.category)) continue;
    picked.push(s);
    used.add(s.e.category);
  }
  for (const s of scored) {
    if (picked.length >= 3) break;
    if (!picked.includes(s)) picked.push(s);
  }

  return picked.map((s) => ({
    experienceId: s.e.id,
    title: s.e.title,
    category: s.e.category,
    price: s.e.price,
    currency: s.e.currency,
    durationMin: s.e.durationMin,
    location: s.e.location,
  }));
}
