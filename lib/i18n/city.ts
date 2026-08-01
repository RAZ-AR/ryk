import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "./locale";

/*
 * Название города на языке интерфейса.
 *
 * Город человек вписывает сам, свободной строкой, и перевести произвольный
 * ввод нельзя. Но пилотных городов всего три (ADR-006), и без них выходило
 * заметно криво: весь экран по-английски, а в шапке «БЕЛГРАД».
 *
 * Поэтому здесь только известные города, а всё остальное отдаётся как есть —
 * человек написал, человек и прочитает.
 *
 * Ключи нормализованы (нижний регистр, дефис = пробел) и повторяют список
 * псевдонимов из lib/weather/openMeteo.ts: города там и здесь — одни и те же.
 */

type CityNames = Record<AppLocale, string>;

const KNOWN: Record<string, CityNames> = {
  белград: { ru: "Белград", en: "Belgrade", es: "Belgrado" },
  beograd: { ru: "Белград", en: "Belgrade", es: "Belgrado" },
  belgrade: { ru: "Белград", en: "Belgrade", es: "Belgrado" },
  belgrado: { ru: "Белград", en: "Belgrade", es: "Belgrado" },
  "нови сад": { ru: "Нови-Сад", en: "Novi Sad", es: "Novi Sad" },
  "novi sad": { ru: "Нови-Сад", en: "Novi Sad", es: "Novi Sad" },
  ереван: { ru: "Ереван", en: "Yerevan", es: "Ereván" },
  yerevan: { ru: "Ереван", en: "Yerevan", es: "Ereván" },
  ereván: { ru: "Ереван", en: "Yerevan", es: "Ereván" },
  erevan: { ru: "Ереван", en: "Yerevan", es: "Ereván" },
};

function normalize(city: string): string {
  return city.trim().toLowerCase().replace(/[-–—]/g, " ").replace(/\s+/g, " ");
}

export function localizeCity(city: string | null, locale: string): string | null {
  if (!city?.trim()) return null;
  const app: AppLocale = isAppLocale(locale) ? locale : DEFAULT_LOCALE;
  return KNOWN[normalize(city)]?.[app] ?? city.trim();
}
