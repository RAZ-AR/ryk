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

export type City = {
  /** Как называется на каждом языке интерфейса. */
  names: Record<AppLocale, string>;
  lat: number;
  lng: number;
  /** Написания, которыми человек может это ввести, уже нормализованные. */
  aliases: readonly string[];
};

export const CITIES: readonly City[] = [
  {
    names: { ru: "Белград", en: "Belgrade", es: "Belgrado" },
    lat: 44.79,
    lng: 20.45,
    aliases: ["белград", "beograd", "belgrade", "belgrado"],
  },
  {
    names: { ru: "Нови-Сад", en: "Novi Sad", es: "Novi Sad" },
    lat: 45.25,
    lng: 19.83,
    aliases: ["нови сад", "novi sad"],
  },
  {
    names: { ru: "Ереван", en: "Yerevan", es: "Ereván" },
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

/** Белград: пилот начинается с него, и он же запасной вариант для погоды. */
export const DEFAULT_CITY = CITIES[0];
