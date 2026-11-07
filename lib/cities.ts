import type { AppLocale } from "./i18n/locale";

/*
 * Пилотные города (ADR-006) — единственный список на весь проект.
 *
 * Раньше их было два: названия жили в lib/i18n/city.ts, координаты —
 * в lib/weather/openMeteo.ts. Списки разошлись сразу же: «Ereván» шапка
 * узнавала и показывала «Yerevan», а погода не узнавала и подставляла
 * Белград. Прогноз кормит подсказку WEATHER_SWAP, то есть человеку в Ереване
 * бот предлагал перенести день по белградской погоде.
 *
 * Поэтому имя и координаты лежат в одной записи: добавить город и забыть
 * половину теперь нельзя.
 */

export type CountryCode = "RS" | "AM";

export type Country = {
  /** ISO 3166-1 alpha-2: по нему фаза 4 выберет календарь праздников. */
  code: CountryCode;
  names: Record<AppLocale, string>;
};

export type City = {
  /**
   * Стабильный ключ для кода и URL. Имена меняются (перевод, правка
   * написания), а ссылаться на город надо чем-то, что не поедет.
   */
  id: string;
  /** Как называется на каждом языке интерфейса. */
  names: Record<AppLocale, string>;
  country: Country;
  /**
   * IANA-пояс. «Лист дня» показывает дату и день года, и считать их надо
   * по месту человека, а не по UTC сервера: в Ереване в 23:00 UTC уже
   * завтра, и лист с вчерашней датой выглядел бы сломанным.
   */
  timeZone: string;
  lat: number;
  lng: number;
  /** Написания, которыми человек может это ввести, уже нормализованные. */
  aliases: readonly string[];
};

const SERBIA: Country = {
  code: "RS",
  names: { ru: "Сербия", en: "Serbia", es: "Serbia" },
};

const ARMENIA: Country = {
  code: "AM",
  names: { ru: "Армения", en: "Armenia", es: "Armenia" },
};

export const CITIES: readonly City[] = [
  {
    id: "belgrade",
    names: { ru: "Белград", en: "Belgrade", es: "Belgrado" },
    country: SERBIA,
    timeZone: "Europe/Belgrade",
    lat: 44.79,
    lng: 20.45,
    aliases: ["белград", "beograd", "belgrade", "belgrado"],
  },
  {
    id: "novi-sad",
    names: { ru: "Нови-Сад", en: "Novi Sad", es: "Novi Sad" },
    country: SERBIA,
    timeZone: "Europe/Belgrade",
    lat: 45.25,
    lng: 19.83,
    aliases: ["нови сад", "novi sad"],
  },
  {
    id: "yerevan",
    names: { ru: "Ереван", en: "Yerevan", es: "Ereván" },
    country: ARMENIA,
    timeZone: "Asia/Yerevan",
    lat: 40.18,
    lng: 44.51,
    aliases: ["ереван", "yerevan", "ereván", "erevan"],
  },
];

/**
 * Приводит ввод к виду ключа: регистр, дефисы и лишние пробелы значения
 * не имеют. «Нови-Сад», «нови сад» и «НОВИ  САД» — один город.
 */
export function normalizeCity(city: string): string {
  return city.trim().toLowerCase().replace(/[-–—]/g, " ").replace(/\s+/g, " ");
}

/** Map, а не литерал объекта: ключ приходит от человека, и `__proto__`
 *  в литерале попал бы в прототип вместо промаха. */
const BY_ALIAS = new Map<string, City>(
  CITIES.flatMap((c) => c.aliases.map((a) => [a, c] as const)),
);

/** null — город незнакомый (или пустой). Вызывающий решает, что делать. */
export function findCity(city: string | null | undefined): City | null {
  if (!city?.trim()) return null;
  return BY_ALIAS.get(normalizeCity(city)) ?? null;
}

const BY_ID = new Map<string, City>(CITIES.map((c) => [c.id, c] as const));

/** Город по стабильному id; null — такого нет. */
export function cityById(id: string | null | undefined): City | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

/**
 * Как город хранится в `users.city`.
 *
 * Знакомый город пишем каноническим русским именем — тем же, что в каталоге
 * (prisma/catalog.ts: «Белград»). Иначе «Belgrade» в профиле и «Белград»
 * у впечатления — разные строки, и всё, что сравнивает их как строки,
 * молча промахивается.
 *
 * Незнакомый город сохраняем как ввели (обрезав пробелы): пилот узкий,
 * но потерять напечатанное человеком хуже, чем не узнать город.
 */
export function canonicalCity(input: string | null | undefined, maxLength: number): string | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  return findCity(trimmed)?.names.ru ?? trimmed.slice(0, maxLength);
}

export type LocalDate = {
  /** YYYY-MM-DD в поясе города. */
  iso: string;
  /** ISO-день недели: 1 — понедельник, 7 — воскресенье. */
  weekday: number;
  /** 1..366 — как на отрывном календаре. */
  dayOfYear: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** Formatter на пояс кэшируем: создание Intl.DateTimeFormat не бесплатное. */
const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = FORMATTERS.get(timeZone);
  if (!f) {
    // en-US + formatToParts: нужны числа и английское сокращение дня недели,
    // а не текст для человека — язык интерфейса здесь ни при чём.
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
    FORMATTERS.set(timeZone, f);
  }
  return f;
}

/**
 * Какое сегодня число в городе. Считаем через Intl, а не сдвигом на
 * фиксированное смещение: у Белграда летнее время, у Еревана нет, и
 * зашитый «+1/+4» однажды весной разошёлся бы с настоящим днём.
 */
export function localDate(city: City, now: Date): LocalDate {
  const parts = formatterFor(city.timeZone).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const weekday = WEEKDAY_INDEX[get("weekday")] ?? 1;

  // Разница полуночей в UTC — чистые сутки, без перехода на летнее время.
  const dayOfYear = (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000 + 1;

  const pad = (n: number) => String(n).padStart(2, "0");
  return { iso: `${year}-${pad(month)}-${pad(day)}`, weekday, dayOfYear };
}

/** Белград: пилот начинается с него, и он же запасной вариант для погоды. */
export const DEFAULT_CITY = CITIES[0];
