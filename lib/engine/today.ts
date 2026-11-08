import { addDaysIso, upcomingMoments, type Moment } from "@/lib/calendar/holidays";
import { DEFAULT_CITY, findCity, localDate, type City, type LocalDate } from "@/lib/cities";
import { pickJoy, seasonOf } from "@/lib/engine/dailyJoy";
import { liveExperienceWhere } from "@/lib/engine/liveExperiences";
import { sameCity } from "@/lib/engine/weekly";
import { localizeExperience } from "@/lib/i18n/experience";
import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";
import { getWeekForecast, type DayWeather, type WeatherKind } from "@/lib/weather/openMeteo";

/*
 * «Лист дня» целиком (ryk_docs/22-daily-joy-plan.md, фаза 4): дата, место,
 * погода и свет, радость дня и «Скоро».
 *
 * Сборка разделена надвое: getToday ходит в сеть и базу, buildToday — чистая
 * функция над уже полученными данными. Логику листа (что показать, что
 * выкинуть, сколько строк в «Скоро») так можно проверить тестом без моков
 * сети.
 *
 * getToday никогда не бросает: лист — украшение главной, и упавшая погода
 * или база не должны ронять экран. Нет данных — нет строки, лист короче.
 */

/** Сколько дней вперёд смотрит «Скоро». */
const SOON_DAYS = 30;
/** Больше двух строк «Скоро» — уже афиша, а не отрывной лист. */
const SOON_MAX = 2;

export type TodayWeather = {
  kind: WeatherKind;
  tempMax: number;
  sunrise: string | null;
  sunset: string | null;
};

export type SoonItem =
  ({ type: "moment" } & Moment) | { type: "experience"; date: string; id: string; title: string };

export type Today = {
  dateIso: string;
  weekday: number;
  dayOfYear: number;
  cityName: string | null;
  countryName: string | null;
  weather: TodayWeather | null;
  /** Как обращаться к человеку на листе; null — лист без обращения. */
  name?: string | null;
  joyKey: string;
  joyParams?: Record<string, string>;
  soon: SoonItem[];
};

/** Ближайшее событие каталога, как его отдала база. */
export type SoonExperienceRow = {
  id: string;
  title: string;
  translations?: unknown;
  startTime: Date;
};

export type TodayUser = {
  id: string;
  /** Как в `users.city`: каноническое имя знакомого города или ввод человека. */
  city: string | null;
  /** "ru" | "RU" | … — принимаем обе стороны Prisma. */
  locale: string;
  joyTraits?: readonly string[] | null;
  /** Имя для обращения: выбранное в онбординге или из Telegram. */
  name?: string | null;
};

export type BuildTodayInput = {
  userId: string;
  locale: AppLocale;
  /** Город из профиля как есть — для незнакомого города показываем его. */
  rawCity: string | null;
  city: City | null;
  local: LocalDate;
  /** Пояс, в котором считать дату события из каталога. */
  timeZone: string;
  forecast: readonly DayWeather[];
  moments: readonly Moment[];
  experience: SoonExperienceRow | null;
  traits?: readonly string[] | null;
};

function appLocale(locale: string): AppLocale {
  const l = locale.toLowerCase();
  return isAppLocale(l) ? l : DEFAULT_LOCALE;
}

/** Дата события в поясе города — та же логика, что у самого листа. */
function localIso(at: Date, timeZone: string): string | null {
  try {
    return localDate({ ...DEFAULT_CITY, timeZone }, at).iso;
  } catch {
    return null;
  }
}

/** Чистая сборка листа из готовых данных. */
export function buildToday(input: BuildTodayInput): Today {
  const { local, city, locale } = input;

  const day = input.forecast.find((d) => d.date === local.iso);
  const weather: TodayWeather | null = day
    ? {
        kind: day.kind,
        tempMax: day.tempMax,
        sunrise: day.sunrise ?? null,
        sunset: day.sunset ?? null,
      }
    : null;

  const joy = pickJoy({
    dateIso: local.iso,
    userId: input.userId,
    season: seasonOf(local.iso),
    weather: weather?.kind ?? null,
    weekday: local.weekday,
    sunset: weather?.sunset ?? null,
    traits: input.traits ?? [],
  });

  // По одной строке каждого рода, а не две ближайшие вообще: иначе
  // полнолуние и равноденствие на одной неделе вытеснили бы событие, ради
  // которого человек может куда-то пойти.
  const soon: SoonItem[] = [];
  const moment = input.moments.find((m) => m.date >= local.iso);
  if (moment) soon.push({ type: "moment", ...moment });

  if (input.experience) {
    const date = localIso(input.experience.startTime, input.timeZone);
    const horizon = addDaysIso(local.iso, SOON_DAYS);
    if (date && date >= local.iso && date < horizon) {
      soon.push({
        type: "experience",
        date,
        id: input.experience.id,
        title: localizeExperience(input.experience, locale).title,
      });
    }
  }
  soon.sort((a, b) => a.date.localeCompare(b.date));

  const rawCity = input.rawCity?.trim() || null;
  const today: Today = {
    dateIso: local.iso,
    weekday: local.weekday,
    dayOfYear: local.dayOfYear,
    cityName: city ? city.names[locale] : rawCity,
    countryName: city ? city.country.names[locale] : null,
    weather,
    joyKey: joy.key,
    soon: soon.slice(0, SOON_MAX),
  };
  // Ключ добавляем, только когда есть подстановки: undefined-поле не нужно
  // ни в сериализации в клиент, ни в toEqual тестов.
  if (joy.params) today.joyParams = joy.params;
  return today;
}

/**
 * Погода только для знакомого города. getWeekForecast для незнакомого
 * подставил бы Белград, и под «Тбилиси» на листе стоял бы белградский закат —
 * лучше не показать строку, чем показать чужую.
 */
async function safeForecast(city: City | null): Promise<DayWeather[]> {
  if (!city) return [];
  try {
    return await getWeekForecast(city.names.ru);
  } catch {
    return [];
  }
}

/** Ближайшее событие каталога с датой в городе человека; null при любой ошибке. */
async function nearestExperience(
  rawCity: string | null,
  now: Date,
): Promise<SoonExperienceRow | null> {
  if (!rawCity?.trim()) return null;
  try {
    const rows = await prisma.experience.findMany({
      where: {
        AND: [
          liveExperienceWhere(now),
          {
            city: { not: null },
            startTime: { gte: now, lt: new Date(now.getTime() + SOON_DAYS * 86_400_000) },
          },
        ],
      },
      orderBy: { startTime: "asc" },
      // Город сравниваем в коде (sameCity понимает «Belgrade» = «Белград»),
      // поэтому берём несколько ближайших и фильтруем здесь.
      take: 20,
      select: { id: true, title: true, translations: true, startTime: true, city: true },
    });
    const hit = rows.find((r) => r.city != null && r.startTime && sameCity(r.city, rawCity));
    if (!hit?.startTime) return null;
    return {
      id: hit.id,
      title: hit.title,
      translations: hit.translations,
      startTime: hit.startTime,
    };
  } catch {
    return null;
  }
}

/** Безопасный localDate: незнакомый город — по поясу Белграда, как и весь пилот. */
function safeLocalDate(city: City | null, now: Date): LocalDate {
  try {
    return localDate(city ?? DEFAULT_CITY, now);
  } catch {
    return localDate({ ...DEFAULT_CITY, timeZone: "UTC" }, now);
  }
}

export async function getToday(user: TodayUser, now: Date = new Date()): Promise<Today> {
  const city = findCity(user.city);
  const local = safeLocalDate(city, now);
  const locale = appLocale(user.locale);

  let moments: Moment[] = [];
  try {
    moments = upcomingMoments(city?.country.code ?? null, local.iso, SOON_DAYS);
  } catch {
    moments = [];
  }

  const [forecast, experience] = await Promise.all([
    safeForecast(city),
    nearestExperience(user.city, now),
  ]);

  const today = buildToday({
    userId: user.id,
    locale,
    rawCity: user.city,
    city,
    local,
    timeZone: (city ?? DEFAULT_CITY).timeZone,
    forecast,
    moments,
    experience,
    traits: user.joyTraits ?? [],
  });
  return { ...today, name: user.name?.trim() || null };
}
