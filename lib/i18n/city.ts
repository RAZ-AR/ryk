import { findCity } from "../cities";
import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "./locale";

/*
 * Название города на языке интерфейса.
 *
 * Город человек вписывает сам, свободной строкой, и перевести произвольный
 * ввод нельзя. Но пилотных городов всего три, и без перевода выходило
 * заметно криво: весь экран по-английски, а в шапке «БЕЛГРАД».
 *
 * Сам список живёт в lib/cities.ts вместе с координатами — там же объяснено,
 * почему они обязаны лежать в одной записи.
 */

export function localizeCity(city: string | null, locale: string): string | null {
  if (!city?.trim()) return null;
  const app: AppLocale = isAppLocale(locale) ? locale : DEFAULT_LOCALE;
  // Незнакомый город отдаём как есть: потерять напечатанное человеком
  // хуже, чем показать название не на том языке.
  return findCity(city)?.names[app] ?? city.trim();
}
