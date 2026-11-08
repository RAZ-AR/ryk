"use server";

import { revalidatePath } from "next/cache";
import type { FreeWindow, LifeBarrier, LifeCategory, SocialMode } from "@/generated/prisma/enums";
import { track } from "@/lib/analytics/track";
import { getSession } from "@/lib/auth/session";
import { structureWish } from "@/lib/ai/structureWish";
import { canonicalCity } from "@/lib/cities";
import { sanitizeJoyTraits, traitsFromText } from "@/lib/engine/joyTraits";
import { prisma } from "@/lib/prisma";
import { normalizeDisplayName } from "@/lib/user/displayName";

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
  /** Мини-билеты «что из этого про тебя?» — id черт из JOY_TRAITS. */
  joyTraits?: string[];
  /** «Как к тебе обращаться?» — пусто или как в Telegram — null. */
  displayName?: string | null;
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
  // Знакомый город — каноническим именем, как в каталоге; незнакомый — как ввели.
  const city = canonicalCity(input.city, 120);

  const mainBarrier =
    input.mainBarrier && BARRIERS.includes(input.mainBarrier) ? input.mainBarrier : null;
  const freeWindows = [...new Set(input.freeWindows ?? [])].filter((w) => WINDOWS.includes(w));

  const goodMoment = input.goodMoment?.trim().slice(0, 500) || null;
  const postponed = input.postponed?.trim().slice(0, 500) || null;
  const displayName = normalizeDisplayName(input.displayName);

  /*
   * Черты: выбранные на мини-билетах плюс те, что честно читаются из
   * хорошего момента. Разбор — простой проход по ключевым словам, а не
   * модель: structureWish отдаёт категорию впечатления, а не черту, и
   * переводить одно в другое значило бы гадать. Не узнали — не добавили.
   */
  const pickedTraits = sanitizeJoyTraits(input.joyTraits);
  const joyTraits = sanitizeJoyTraits([...pickedTraits, ...traitsFromText(goodMoment)]);

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
   * Оба разбора независимы — параллельно: человек ждёт на кнопке «Готово»,
   * и два последовательных похода к модели удваивали это ожидание.
   */
  const [momentStructured, postponedStructured] = await Promise.all([
    goodMoment ? structureWish(goodMoment).catch(() => null) : null,
    postponed ? structureWish(postponed).catch(() => null) : null,
  ]);

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
          goodMoment,
          joyTraits,
          displayName,
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
      // Всего черт, включая найденные в рассказе: видно, узнаём ли мы
      // человека, даже когда мини-билеты он пролистал.
      traits: joyTraits.length,
    },
  });

  // Только счётчик и только выбранное руками — сами черты про человека,
  // а не про воронку. Ноль не шлём: «не выбрал» уже видно по traits.
  if (pickedTraits.length > 0) {
    await track(session.userId, {
      name: "joy_traits_picked",
      props: { count: pickedTraits.length },
    });
  }

  revalidatePath("/");
  return { ok: true };
}
