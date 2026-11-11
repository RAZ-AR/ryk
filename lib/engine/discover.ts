import type { ExperienceKind, LifeCategory } from "@/generated/prisma/enums";
import {
  cardReason,
  cardWhen,
  type CardReason,
  type CardWhen,
  type ContextProfile,
} from "@/lib/engine/cardContext";
import { getFeltGoodCategories } from "@/lib/engine/feltGood";
import { liveExperienceWhere } from "@/lib/engine/liveExperiences";
import { dailySeed, mixByKind } from "@/lib/engine/mix";
import { sameCity } from "@/lib/engine/weekly";
import { localizeExperience } from "@/lib/i18n/experience";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";
import { getWeekForecast } from "@/lib/weather/openMeteo";

/*
 * Лента: впечатления, на которые человек ещё не реагировал.
 *
 * Каталог курируемый и небольшой (ADR-006), поэтому колода — это не
 * бесконечный фид: она естественно кончается, и это нормальное состояние
 * экрана, а не ошибка.
 *
 * Порядок задаёт mixByKind: доля событий ограничена сверху, чтобы лента не
 * скатывалась в афишу города, а перемешивание детерминированное по дню —
 * чтобы карточки не прыгали при каждом открытии приложения.
 *
 * Каждая карточка несёт контекст человека (lib/engine/cardContext.ts):
 * одну причину «почему тебе» и метку «когда» с погодой для уличного.
 * Афиша чужого города в ленту не попадает: событие в Белграде человеку
 * в Ереване не прожить, а вызовы и ритуалы к городу не привязаны.
 */

export type DeckCard = {
  id: string;
  title: string;
  description: string | null;
  category: LifeCategory;
  kind: ExperienceKind;
  location: string | null;
  price: number | null;
  currency: string;
  durationMin: number | null;
  imageUrl: string | null;
  sponsored: boolean;
  /** Почему это тебе; null — честной причины нет, строки не будет. */
  reason: CardReason | null;
  /** Когда событие, в поясе человека; null — без даты. */
  when: CardWhen | null;
};

const DECK_LIMIT = 30;

export async function getDiscoverDeck(
  userId: string,
  locale: string = DEFAULT_LOCALE,
): Promise<DeckCard[]> {
  const [experiences, user, prefs, feltGood] = await Promise.all([
    prisma.experience.findMany({
      where: {
        ...liveExperienceWhere(),
        // Уже отреагировал — карточка не возвращается.
        reactions: { none: { userId } },
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        kind: true,
        location: true,
        price: true,
        currency: true,
        durationMin: true,
        imageUrl: true,
        sponsored: true,
        translations: true,
        city: true,
        distanceKm: true,
        startTime: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        city: true,
        radiusKm: true,
        budgetMax: true,
        mainBarrier: true,
        freeWindows: true,
        timezone: true,
      },
    }),
    prisma.preference.findMany({
      where: { userId, sentiment: "LIKE" },
      select: { category: true },
    }),
    getFeltGoodCategories(userId),
  ]);

  const userCity = user?.city ?? null;
  const profile: ContextProfile = {
    budgetMax: user?.budgetMax ?? null,
    radiusKm: user?.radiusKm ?? null,
    mainBarrier: user?.mainBarrier ?? null,
    freeWindows: user?.freeWindows ?? [],
    timezone: user?.timezone ?? "UTC",
    liked: new Set(prefs.map((p) => p.category)),
    feltGood,
  };

  const local = experiences.filter(
    (e) => !(e.kind === "EVENT" && e.city && userCity && !sameCity(e.city, userCity)),
  );
  const deck = mixByKind(local, DECK_LIMIT, dailySeed(userId));

  // Прогноз нужен только если в колоде есть уличное событие с датой:
  // без него не ходим во внешний сервис вовсе.
  const needsForecast = deck.some(
    (e) => e.startTime && (e.category === "NATURE" || e.category === "MOVEMENT"),
  );
  const forecast = new Map(
    (needsForecast ? await getWeekForecast(userCity) : []).map((d) => [d.date, d] as const),
  );

  // Переводим после отбора: порядок в колоде от языка не зависит, а
  // mixByKind отбрасывает лишнее — переводить его было бы напрасной работой.
  return deck.map((e) => {
    const card = {
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      kind: e.kind,
      location: e.location,
      price: e.price,
      currency: e.currency,
      durationMin: e.durationMin,
      imageUrl: e.imageUrl,
      sponsored: e.sponsored,
    };
    return {
      ...card,
      ...localizeExperience({ ...card, translations: e.translations }, locale),
      reason: cardReason(profile, e),
      when: cardWhen(e, profile.timezone, forecast),
    };
  });
}
