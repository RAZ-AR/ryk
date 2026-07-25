import type { DayWeather } from "@/lib/weather/openMeteo";

/*
 * Companion Nudges (ryk_docs/07-ai-companion.md).
 *
 * Правила, которые здесь зашиты:
 *  - подсказка контекстная, а не «не забудь» по таймеру;
 *  - одно действие на сообщение;
 *  - ноль языка вины — не бывает «ты провалил неделю».
 *
 * Возвращаем КОД подсказки, тексты живут в messages/* — иначе тон
 * расползётся по коду и его нельзя будет проверить (14-brand-and-copy).
 */

export type NudgeCode =
  /** Погода в выбранный день плохая, но рядом есть день получше. */
  | "WEATHER_SWAP"
  /** Погода плохая, лучшего дня нет — предлагаем подумать о запасном плане. */
  | "WEATHER_WATCH"
  /** Событие сегодня. */
  | "TODAY"
  /** Событие завтра. */
  | "TOMORROW"
  /** Собирался не один, но спутник не назван. */
  | "INVITE_SOMEONE"
  /** Всё в порядке — просто держим в поле зрения. */
  | "ON_TRACK";

export type Nudge = {
  code: NudgeCode;
  /** Для WEATHER_SWAP — день, который предлагаем взамен (ISO). */
  suggestedDate?: string;
  /** Для WEATHER_SWAP — погода предложенного дня. */
  suggestedWeather?: DayWeather;
  /** Дней до события (0 = сегодня). null, если день не выбран. */
  daysLeft: number | null;
};

const BAD: ReadonlyArray<DayWeather["kind"]> = ["RAIN", "SNOW", "STORM"];

/** Целые дни между двумя ISO-датами (YYYY-MM-DD). */
function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00.000Z`);
  const b = Date.parse(`${toIso}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

export function buildNudge(input: {
  /** ISO-дата события; null, если день не выбран. */
  plannedFor: string | null;
  /** Прогноз на неделю (может быть пустым — тогда про погоду молчим). */
  forecast: DayWeather[];
  socialMode: string | null;
  companionName: string | null;
  /** Сегодня в ISO — параметром, чтобы функция была тестируемой. */
  todayIso: string;
}): Nudge {
  const { plannedFor, forecast, socialMode, companionName, todayIso } = input;

  const daysLeft = plannedFor ? daysBetween(todayIso, plannedFor) : null;
  const planned = plannedFor ? forecast.find((d) => d.date === plannedFor) : undefined;

  // 1. Погода — самый полезный контекст: даёт конкретное действие.
  if (planned && BAD.includes(planned.kind)) {
    // Ищем ближайший день без осадков, начиная с сегодня.
    const better = forecast.find((d) => d.date >= todayIso && !BAD.includes(d.kind));
    if (better && better.date !== plannedFor) {
      return {
        code: "WEATHER_SWAP",
        suggestedDate: better.date,
        suggestedWeather: better,
        daysLeft,
      };
    }
    return { code: "WEATHER_WATCH", daysLeft };
  }

  // 2. Близость события — тоже контекст, но без давления.
  if (daysLeft === 0) return { code: "TODAY", daysLeft };
  if (daysLeft === 1) return { code: "TOMORROW", daysLeft };

  // 3. Собирался с кем-то, но никого не назвал — помощь, а не упрёк.
  if (socialMode && socialMode !== "SOLO" && !companionName) {
    return { code: "INVITE_SOMEONE", daysLeft };
  }

  return { code: "ON_TRACK", daysLeft };
}
