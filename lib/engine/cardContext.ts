import type {
  ExperienceKind,
  FreeWindow,
  LifeBarrier,
  LifeCategory,
} from "@/generated/prisma/enums";
import { soonWhen, type SoonWhen } from "@/lib/ui/dayLeaf";
import type { WeatherKind } from "@/lib/weather/openMeteo";

/*
 * Карточка в контексте человека: одна причина «почему тебе» и живая метка
 * «когда» (ryk_docs/06-experience-engine.md §Explainability).
 *
 * Причина ровно одна — самая личная из честных. Порядок:
 *   1. обход названного препятствия — человек сам сказал, что ему мешает;
 *   2. «тебе было хорошо» — эмоция из чек-ина прожитой истории;
 *   3. попадает в свободное время — у события есть час, у человека окна;
 *   4. рядом — известное расстояние в пределах радиуса;
 *   5. нравится категория — онбординг и свайпы;
 *   6. в бюджете — платное и влезает.
 * Причины нет — строки нет. «Куратор советует» в ленте не пишем: это правда
 * про любую карточку, а значит ничего не сообщает.
 *
 * Всё здесь чистое: данные приходят аргументами, время — тоже.
 */

export type CardReason =
  | { code: "SHORT" }
  | { code: "FREE" }
  | { code: "LOW_ENERGY" }
  | { code: "FELT_GOOD"; category: LifeCategory }
  | { code: "FITS_WINDOW" }
  | { code: "LIKED_CATEGORY"; category: LifeCategory }
  | { code: "NEARBY"; km: number }
  | { code: "IN_BUDGET" };

/** Когда событие: календарная дата и час в поясе человека. */
export type CardWhen = {
  /** YYYY-MM-DD в поясе человека. */
  date: string;
  /** Словом: сегодня, завтра, день недели или просто дата — без отсчёта. */
  rel: SoonWhen;
  /** «19:00»; null — у события только дата (полночь = время не задано). */
  time: string | null;
  /** Прогноз на этот день — только уличным категориям и если он есть. */
  weather: { kind: WeatherKind; tempMax: number } | null;
};

export type ContextProfile = {
  budgetMax: number | null;
  radiusKm: number | null;
  mainBarrier: LifeBarrier | null;
  freeWindows: readonly FreeWindow[];
  timezone: string;
  liked: ReadonlySet<LifeCategory>;
  /** Категории прожитых историй, после которых человек отметил эмоцию. */
  feltGood: ReadonlySet<LifeCategory>;
};

export type ContextExperience = {
  category: LifeCategory;
  kind: ExperienceKind;
  price: number | null;
  durationMin: number | null;
  distanceKm: number | null;
  startTime: Date | null;
};

const SHORT_MINUTES = 60;

/** Погода важна там, где впечатление под открытым небом. */
const OUTDOOR: ReadonlySet<LifeCategory> = new Set<LifeCategory>(["NATURE", "MOVEMENT"]);

/** Дата, час и день недели момента в поясе человека. */
export function localParts(
  at: Date,
  timezone: string,
): { date: string; hour: number; minute: number; weekday: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    }).formatToParts(at);
  } catch {
    // Незнакомый пояс в профиле — считаем по UTC, а не роняем ленту.
    return localParts(at, "UTC");
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: weekdays.indexOf(get("weekday")) + 1,
  };
}

/**
 * Попадает ли час события в окно, которое человек назвал свободным.
 * Утро — до 12, вечер — с 17; выходной день — до 17. Событие без часа
 * (полночь) ни в какое окно не попадает: мы не знаем, когда оно.
 */
export function fitsFreeWindow(
  startTime: Date,
  timezone: string,
  freeWindows: readonly FreeWindow[],
): boolean {
  const { hour, minute, weekday } = localParts(startTime, timezone);
  if (hour === 0 && minute === 0) return false;
  const weekend = weekday >= 6;
  const evening = hour >= 17;
  let window: FreeWindow | null;
  if (weekend) window = evening ? "WEEKEND_EVENING" : "WEEKEND_DAY";
  else if (evening) window = "WEEKDAY_EVENING";
  else if (hour < 12) window = "WEEKDAY_MORNING";
  // Будний день с 12 до 17 — рабочие часы: такого окна в анкете нет.
  else window = null;
  return window != null && freeWindows.includes(window);
}

export function cardReason(p: ContextProfile, e: ContextExperience): CardReason | null {
  // 1. Обход препятствия — те же честные признаки, что в barrierBoost.
  if (p.mainBarrier === "NO_TIME" && e.durationMin != null && e.durationMin <= SHORT_MINUTES)
    return { code: "SHORT" };
  if (p.mainBarrier === "TOO_EXPENSIVE" && e.price === 0) return { code: "FREE" };
  if (p.mainBarrier === "NO_ENERGY" && e.kind === "RITUAL") return { code: "LOW_ENERGY" };

  // 2. Прожитое и понравившееся сильнее заявленного.
  if (p.feltGood.has(e.category)) return { code: "FELT_GOOD", category: e.category };

  // 3. Событие с часом, который человек назвал свободным.
  if (e.startTime && fitsFreeWindow(e.startTime, p.timezone, p.freeWindows))
    return { code: "FITS_WINDOW" };

  // 4. Рядом — только когда расстояние известно, а не «наверное, близко».
  // Выше интереса: конкретный факт говорит больше, чем «ты это любишь»,
  // которое у человека с широкими вкусами стояло бы на каждой карточке.
  if (e.distanceKm != null && (p.radiusKm == null || e.distanceKm <= p.radiusKm))
    return { code: "NEARBY", km: Math.max(1, Math.round(e.distanceKm)) };

  // 5. Заявленный интерес.
  if (p.liked.has(e.category)) return { code: "LIKED_CATEGORY", category: e.category };

  // 6. В бюджете — только платное: «бесплатно» и так написано в цене.
  if (p.budgetMax != null && e.price != null && e.price > 0 && e.price <= p.budgetMax)
    return { code: "IN_BUDGET" };

  return null;
}

export function cardWhen(
  e: Pick<ContextExperience, "startTime" | "category">,
  timezone: string,
  forecast: ReadonlyMap<string, { kind: WeatherKind; tempMax: number }>,
  now: Date = new Date(),
): CardWhen | null {
  if (!e.startTime) return null;
  const { date, hour, minute } = localParts(e.startTime, timezone);
  const day = OUTDOOR.has(e.category) ? forecast.get(date) : undefined;
  return {
    date,
    rel: soonWhen(localParts(now, timezone).date, date),
    time:
      hour === 0 && minute === 0
        ? null
        : `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    weather: day ? { kind: day.kind, tempMax: day.tempMax } : null,
  };
}
