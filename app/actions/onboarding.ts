"use server";

import { revalidatePath } from "next/cache";
import type { LifeCategory, SocialMode } from "@/generated/prisma/enums";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/*
 * Завершение онбординга (Flow A): пишем предпочтения и рамки недели,
 * переводим onboardingState в DONE. Всё атомарно.
 */

const CATEGORIES: readonly LifeCategory[] = [
  "NATURE",
  "CULTURE",
  "DISCOVERY",
  "MOVEMENT",
  "CONNECTION",
  "JOY",
  "CHALLENGE",
  "REST",
];

const SOCIAL_MODES: readonly SocialMode[] = ["SOLO", "CLOSE_ONES", "NEW_PEOPLE"];

export type OnboardingInput = {
  /** Выбранные категории интересов. */
  categories: LifeCategory[];
  /** Реакции на пробные идеи: id пробы → понравилось. */
  swipes: { category: LifeCategory; liked: boolean }[];
  budgetMax: number | null;
  socialMode: SocialMode | null;
  noveltyRatio: number;
  city: string | null;
};

export type OnboardingResult = { ok: true } | { ok: false; reason: string };

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  // Валидация ввода — не доверяем клиенту.
  const categories = input.categories.filter((c) => CATEGORIES.includes(c));
  const socialMode =
    input.socialMode && SOCIAL_MODES.includes(input.socialMode) ? input.socialMode : null;
  const noveltyRatio = Math.min(100, Math.max(0, Math.round(input.noveltyRatio)));
  const budgetMax =
    typeof input.budgetMax === "number" && input.budgetMax > 0 ? Math.round(input.budgetMax) : null;
  const city = input.city?.trim() ? input.city.trim().slice(0, 120) : null;

  type PrefRow = {
    userId: string;
    category: LifeCategory;
    sentiment: "LIKE" | "DISLIKE";
    source: "ONBOARDING_CATEGORY" | "ONBOARDING_SWIPE";
    confidence: number;
  };

  // Предпочтения из категорий (явный интерес).
  const categoryPrefs: PrefRow[] = categories.map((category) => ({
    userId: session.userId,
    category,
    sentiment: "LIKE",
    source: "ONBOARDING_CATEGORY",
    confidence: 0.7,
  }));

  // Предпочтения из свайпов (сигнал по категории пробы).
  const swipePrefs: PrefRow[] = input.swipes
    .filter((s) => CATEGORIES.includes(s.category))
    .map((s) => ({
      userId: session.userId,
      category: s.category,
      sentiment: s.liked ? "LIKE" : "DISLIKE",
      source: "ONBOARDING_SWIPE",
      confidence: 0.5,
    }));

  try {
    await prisma.$transaction(async (tx) => {
      // Переустанавливаем предпочтения онбординга идемпотентно
      // (на случай повторного прохождения).
      await tx.preference.deleteMany({
        where: {
          userId: session.userId,
          source: { in: ["ONBOARDING_CATEGORY", "ONBOARDING_SWIPE"] },
        },
      });

      // Схлопываем дубли по (category) — уникальный ключ (userId, category, entity=null).
      const byCategory = new Map<string, PrefRow>();
      for (const p of [...categoryPrefs, ...swipePrefs]) {
        // Категория-интерес приоритетнее свайпа; LIKE приоритетнее DISLIKE.
        const existing = byCategory.get(p.category);
        if (!existing || (existing.sentiment === "DISLIKE" && p.sentiment === "LIKE")) {
          byCategory.set(p.category, p);
        }
      }
      if (byCategory.size > 0) {
        await tx.preference.createMany({ data: [...byCategory.values()] });
      }

      await tx.user.update({
        where: { id: session.userId },
        data: {
          budgetMax,
          socialMode,
          noveltyRatio,
          ...(city ? { city } : {}),
          onboardingState: "DONE",
        },
      });
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/");
  return { ok: true };
}
