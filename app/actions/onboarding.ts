"use server";

import { revalidatePath } from "next/cache";
import type { FreeWindow, LifeBarrier, LifeCategory, SocialMode } from "@/generated/prisma/enums";
import { track } from "@/lib/analytics/track";
import { getSession } from "@/lib/auth/session";
import { structureWish } from "@/lib/ai/structureWish";
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
  // Вклад раньше отсутствовал в списке, и выбор этой категории молча
  // терялся — в сетке онбординга её тоже не было.
  "CONTRIBUTION",
];

const SOCIAL_MODES: readonly SocialMode[] = ["SOLO", "CLOSE_ONES", "NEW_PEOPLE"];

const BARRIERS: readonly LifeBarrier[] = [
  "NO_TIME",
  "TOO_EXPENSIVE",
  "NO_COMPANY",
  "FEAR",
  "NO_ENERGY",
];

const WINDOWS: readonly FreeWindow[] = [
  "WEEKDAY_MORNING",
  "WEEKDAY_EVENING",
  "WEEKEND_DAY",
  "WEEKEND_EVENING",
];

export type OnboardingInput = {
  /** Выбранные категории интересов. */
  categories: LifeCategory[];
  /** Реакции на пробные идеи: id пробы → понравилось. */
  swipes: { category: LifeCategory; liked: boolean }[];
  budgetMax: number | null;
  socialMode: SocialMode | null;
  noveltyRatio: number;
  city: string | null;
  /** Свободный текст: когда последний раз было хорошо. Шаг пропускаем — null. */
  goodMoment?: string | null;
  /** Свободный текст: что давно откладывается. Станет желанием. */
  postponed?: string | null;
  mainBarrier?: LifeBarrier | null;
  freeWindows?: FreeWindow[];
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

  const mainBarrier =
    input.mainBarrier && BARRIERS.includes(input.mainBarrier) ? input.mainBarrier : null;
  const freeWindows = [...new Set(input.freeWindows ?? [])].filter((w) => WINDOWS.includes(w));

  const goodMoment = input.goodMoment?.trim().slice(0, 500) || null;
  const postponed = input.postponed?.trim().slice(0, 500) || null;

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

  /*
   * Свободные тексты разбираем ДО транзакции: это сетевой вызов к модели,
   * держать на нём открытую транзакцию нельзя. Разбор может не удаться —
   * тогда просто не будет вывода, но онбординг всё равно завершится.
   */
  const momentStructured = goodMoment ? await structureWish(goodMoment).catch(() => null) : null;
  const postponedStructured = postponed ? await structureWish(postponed).catch(() => null) : null;

  // Рассказанный хороший момент — самый честный сигнал вкуса из всего
  // онбординга: человек его вспомнил сам, а не выбрал из нашей сетки.
  const momentPrefs: PrefRow[] = momentStructured
    ? [
        {
          userId: session.userId,
          category: momentStructured.category,
          sentiment: "LIKE",
          source: "ONBOARDING_CATEGORY",
          confidence: 0.8,
        },
      ]
    : [];

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

      /*
       * Схлопываем дубли по категории — уникальный ключ (userId, category,
       * entity=null). Правила: LIKE перевешивает DISLIKE, а при равном
       * знаке побеждает более уверенный сигнал. Без второго правила рассказ
       * своими словами (0.8) проигрывал случайному свайпу (0.5) просто
       * потому, что тот шёл раньше в массиве.
       */
      const byCategory = new Map<string, PrefRow>();
      for (const p of [...categoryPrefs, ...swipePrefs, ...momentPrefs]) {
        const existing = byCategory.get(p.category);
        const wins =
          !existing ||
          (existing.sentiment === "DISLIKE" && p.sentiment === "LIKE") ||
          (existing.sentiment === p.sentiment && p.confidence > existing.confidence);
        if (wins) byCategory.set(p.category, p);
      }
      if (byCategory.size > 0) {
        await tx.preference.createMany({ data: [...byCategory.values()] });
      }

      // Отложенное становится желанием — тем же путём, что и из вишлиста,
      // чтобы оно сразу участвовало в подборе недели.
      if (postponed) {
        await tx.wish.create({
          data: {
            userId: session.userId,
            text: postponed,
            category: postponedStructured?.category ?? null,
            budget: postponedStructured?.budget ?? null,
            status: postponedStructured?.timing ?? "SOMEDAY",
          },
        });
      }

      await tx.user.update({
        where: { id: session.userId },
        data: {
          budgetMax,
          socialMode,
          noveltyRatio,
          mainBarrier,
          freeWindows,
          ...(city ? { city } : {}),
          onboardingState: "DONE",
        },
      });
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  await track(session.userId, {
    name: "onboarding_completed",
    props: {
      categories: categories.length,
      hasBudget: budgetMax != null,
      // Сколько необязательных шагов человек прошёл, а не пролистал —
      // по этому будет видно, не слишком ли длинным вышел онбординг.
      toldMoment: goodMoment != null,
      toldPostponed: postponed != null,
      namedBarrier: mainBarrier != null,
      windows: freeWindows.length,
      swipes: input.swipes.length,
    },
  });

  revalidatePath("/");
  return { ok: true };
}
