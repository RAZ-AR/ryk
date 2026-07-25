import type { LifeCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/*
 * Experience Engine v0 (ryk_docs/06-experience-engine.md).
 * Упрощённый scoring: Relevance × Feasibility × Timing, портфель — с
 * разнообразием категорий. Каждая рекомендация несёт код «почему» (§Explainability).
 */

export type WhyCode = "LIKED_CATEGORY" | "IN_BUDGET" | "NEARBY" | "CURATED" | "FRESH";

export type Candidate = {
  experienceId: string;
  title: string;
  category: LifeCategory;
  price: number | null;
  currency: string;
  durationMin: number | null;
  distanceKm: number | null;
  location: string | null;
  sponsored: boolean;
  whyCode: WhyCode;
  whyCategory: LifeCategory | null;
};

export type SelectedStory = {
  title: string;
  category: LifeCategory;
  price: number | null;
  currency: string;
  location: string | null;
  whyCode: WhyCode;
  whyCategory: LifeCategory | null;
};

export type WeeklyView =
  | { kind: "selected"; weekStart: string; story: SelectedStory }
  | { kind: "choose"; weekStart: string; candidates: Candidate[] };

/** Понедельник текущей недели в UTC (ADR-004), для weekly_stories.weekStart (@db.Date). */
export function weekStartUTC(now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0=вс..6=сб
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function pickWhy(
  liked: boolean,
  category: LifeCategory,
  inBudget: boolean,
  nearby: boolean,
): { whyCode: WhyCode; whyCategory: LifeCategory | null } {
  if (liked) return { whyCode: "LIKED_CATEGORY", whyCategory: category };
  if (nearby) return { whyCode: "NEARBY", whyCategory: null };
  if (inBudget) return { whyCode: "IN_BUDGET", whyCategory: null };
  return { whyCode: "CURATED", whyCategory: null };
}

export async function getWeeklyView(userId: string): Promise<WeeklyView> {
  const weekStart = weekStartUTC();
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  // Уже выбранная история недели?
  const existing = await prisma.weeklyStory.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
    include: { experience: true },
  });
  if (existing?.experience) {
    const e = existing.experience;
    const whyCode = (existing.whyExplanation as WhyCode) || "CURATED";
    return {
      kind: "selected",
      weekStart: weekStartIso,
      story: {
        title: e.title,
        category: e.category,
        price: e.price,
        currency: e.currency,
        location: e.location,
        whyCode,
        // Для LIKED_CATEGORY «понравившаяся» категория = категория впечатления.
        whyCategory: whyCode === "LIKED_CATEGORY" ? e.category : null,
      },
    };
  }

  const [user, prefs, experiences] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { budgetMax: true, city: true, radiusKm: true },
    }),
    prisma.preference.findMany({
      where: { userId, sentiment: "LIKE" },
      select: { category: true },
    }),
    prisma.experience.findMany({ take: 50 }),
  ]);

  const liked = new Set<LifeCategory>(prefs.map((p) => p.category));
  const budgetMax = user?.budgetMax ?? null;
  const radiusKm = user?.radiusKm ?? null;
  const userCity = user?.city ?? null;

  const scored = experiences
    .map((e) => {
      const isLiked = liked.has(e.category);
      const inBudget = budgetMax == null || e.price == null || e.price <= budgetMax;
      const nearby =
        (radiusKm == null || e.distanceKm == null || e.distanceKm <= radiusKm) &&
        (userCity == null || e.city == null || e.city === userCity);

      const relevance = isLiked ? 2 : 0.6;
      const feasibility = inBudget ? 1 : 0.3;
      const proximity = nearby ? 1 : 0.6;
      // Детерминированный джиттер по id — стабильный порядок в течение недели.
      const jitter = (parseInt(e.id.replace(/\D/g, "").slice(0, 4) || "0", 10) % 17) / 100;
      const score = relevance * feasibility * proximity + jitter;

      return { e, score, ...pickWhy(isLiked, e.category, inBudget, nearby) };
    })
    .sort((a, b) => b.score - a.score);

  // Портфель: разнообразие категорий, затем добор.
  const picked: typeof scored = [];
  const usedCategories = new Set<LifeCategory>();
  for (const s of scored) {
    if (picked.length >= 3) break;
    if (usedCategories.has(s.e.category)) continue;
    picked.push(s);
    usedCategories.add(s.e.category);
  }
  for (const s of scored) {
    if (picked.length >= 3) break;
    if (!picked.includes(s)) picked.push(s);
  }

  const candidates: Candidate[] = picked.map((s) => ({
    experienceId: s.e.id,
    title: s.e.title,
    category: s.e.category,
    price: s.e.price,
    currency: s.e.currency,
    durationMin: s.e.durationMin,
    distanceKm: s.e.distanceKm,
    location: s.e.location,
    sponsored: s.e.sponsored,
    whyCode: s.whyCode,
    whyCategory: s.whyCategory,
  }));

  return { kind: "choose", weekStart: weekStartIso, candidates };
}
