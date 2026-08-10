import type { Prisma } from "@/generated/prisma/client";
import type { DetectedPlace } from "@/lib/geo/detectedCity";
import { findCity } from "@/lib/cities";

/*
 * Человек открыл Mini App не там, где живёт (Flow J, ryk_docs/05-user-flows).
 *
 * Решение вынесено из компонента отдельной функцией: у него четыре исхода
 * и три входа, и единственный способ не запутаться в них — проверять
 * таблицей, а не глазами по экрану.
 */

export type TravelState =
  /** Дома, или сеть промолчала. Ничего не показываем и ничего не спрашиваем. */
  | { kind: "home" }
  /** Другой город пилота, ещё не спрашивали. Единственный случай с вопросом. */
  | { kind: "ask"; city: string }
  /**
   * Другой город пилота, но человек уже сказал «нет». Молчим до следующей
   * смены города: повторный вопрос — это давление, только про географию.
   */
  | { kind: "dismissed" }
  /**
   * Города нет в пилоте. Предлагать смену некуда, врать нельзя — честно
   * говорим и включаем дорожный режим.
   */
  | { kind: "away"; place: string };

/**
 * @param homeCity      город профиля (`users.city`)
 * @param dismissedCity город, про который уже спрашивали и получили «нет»
 * @param detected      что сказала сеть
 * @param locale        язык интерфейса — на нём и называем город
 */
export function travelState(
  homeCity: string | null,
  dismissedCity: string | null,
  detected: DetectedPlace,
  locale: "ru" | "en" | "es",
): TravelState {
  // Сеть промолчала — вести себя так, будто человек дома. Догадка о поездке
  // на пустом месте хуже, чем отсутствие догадки.
  if (!detected.raw) return { kind: "home" };

  // Город не из пилота: каталога здесь нет, менять город не на что.
  if (!detected.city) return { kind: "away", place: detected.raw };

  const home = findCity(homeCity);
  // Сравниваем города, а не строки: «Нови-Сад» из профиля и «Novi Sad»
  // из заголовка — одно место, и вопрос про переезд туда был бы абсурдом.
  if (home && home === detected.city) return { kind: "home" };

  // Домашнего города ещё нет (онбординг пропустил графу) — спрашивать не о
  // чем: подставить определённый город молча тоже нельзя, это делает
  // онбординг с подтверждением.
  if (!home) return { kind: "home" };

  if (findCity(dismissedCity) === detected.city) return { kind: "dismissed" };

  return { kind: "ask", city: detected.city.names[locale] };
}

/**
 * Дорожный режим: показываем только то, что не зависит от города. В схеме
 * эти два вида так и описаны — CHALLENGE «живёт вечно, часто бесплатно»,
 * RITUAL «ноль логистики, ноль денег». Поэтому фильтр, а не отдельная
 * витрина для поездок.
 */
export function isTravelMode(state: TravelState): boolean {
  return state.kind === "away";
}

/**
 * Человек не просто «не в поездке», а доказанно дома: сеть назвала город,
 * и это его город. Отдельно от `kind === "home"`, потому что тот же исход
 * даёт молчащая сеть — а на молчании гасить память об отказе нельзя,
 * иначе вопрос воскресал бы при каждом запросе без заголовка.
 */
export function isVerifiedHome(homeCity: string | null, detected: DetectedPlace): boolean {
  const home = findCity(homeCity);
  return home != null && detected.city != null && home === detected.city;
}

/**
 * Условие каталога в дорожном режиме. Пусто, когда человек дома, — тогда
 * город остаётся мягким фактором подбора, как и был, а не жёстким фильтром.
 */
export function travelModeWhere(travelMode: boolean): Prisma.ExperienceWhereInput {
  if (!travelMode) return {};
  return { city: null, kind: { in: ["CHALLENGE", "RITUAL"] } };
}
