import { headers } from "next/headers";
import { findCity, type City } from "@/lib/cities";

/*
 * Где человек прямо сейчас — по IP запроса (ryk_docs/21, Flow J).
 *
 * Почему IP, а не геолокация: Telegram `LocationManager` и браузерный
 * Geolocation дали бы точнее, но ценой системного промпта на первом экране.
 * Продукт обещает «закрой приложение и иди жить», а не «разреши доступ»,
 * и точности до города здесь достаточно — каталог курируется по городам,
 * не по кварталам (ADR-006).
 *
 * Сам IP никуда не сохраняется: он живёт в пределах запроса, а в базу
 * попадает только название города и только когда человек его подтвердил.
 */

/** Заголовок Vercel: название города в percent-encoding («Novi%20Sad»). */
export const CITY_HEADER = "x-vercel-ip-city";

export type DetectedPlace = {
  /**
   * Город пилота, если сеть назвала знакомое. `null` — не узнали, и это
   * не повод подставить Белград: молчаливая подстановка столицы пилота
   * один раз уже стоила бага с погодой (см. lib/cities.ts).
   */
  city: City | null;
  /**
   * Что вообще сказала сеть, как есть. Нужно, чтобы честно сказать
   * «меня здесь пока нет», а не делать вид, что мы не знаем, где человек.
   */
  raw: string | null;
};

export const UNKNOWN_PLACE: DetectedPlace = { city: null, raw: null };

/**
 * Разбор значения заголовка. Отдельно от чтения запроса, чтобы
 * проверяться без поднятого сервера.
 */
export function parseDetectedCity(value: string | null | undefined): DetectedPlace {
  const trimmed = value?.trim();
  if (!trimmed) return UNKNOWN_PLACE;

  let raw: string;
  try {
    raw = decodeURIComponent(trimmed).trim();
  } catch {
    // Битый percent-encoding: заголовок пришёл не от Vercel или его
    // испортил прокси. Не знать города лучше, чем показать мусор.
    return UNKNOWN_PLACE;
  }

  if (!raw) return UNKNOWN_PLACE;
  return { city: findCity(raw), raw };
}

/** То же для серверного компонента или действия. */
export async function detectPlace(): Promise<DetectedPlace> {
  const requestHeaders = await headers();
  return parseDetectedCity(requestHeaders.get(CITY_HEADER));
}
