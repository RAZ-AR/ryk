import { DEFAULT_CITY, findCity } from "@/lib/cities";

/*
 * Погода через Open-Meteo (ADR-006): без ключа, покрывает EU/Балканы/Кавказ.
 * Используется в planning assistance — «в субботу ясно, +8°».
 *
 * Никогда не бросает: погода — украшение плана, а не блокер.
 */

export type WeatherKind = "CLEAR" | "CLOUDY" | "RAIN" | "SNOW" | "STORM";

export type DayWeather = {
  /** ISO-дата YYYY-MM-DD. */
  date: string;
  kind: WeatherKind;
  tempMax: number;
};

/** WMO weather code → наша укрупнённая категория. */
function kindFromCode(code: number): WeatherKind {
  if (code >= 95) return "STORM";
  if (code >= 71 && code <= 86) return "SNOW";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "RAIN";
  if (code >= 1 && code <= 48) return "CLOUDY";
  return "CLEAR";
}

/**
 * Координаты пилотных городов берём из общего списка (lib/cities.ts): раньше
 * он был свой, и написания разъезжались — «Ereván» шапка узнавала, а погода
 * нет и молча считала прогноз по Белграду.
 *
 * Незнакомый город по-прежнему уходит в Белград: показать погоду не того
 * города плохо, но не показать её вовсе — тоже, а пилот начинается с Белграда.
 */
export function coordsForCity(city: string | null): { lat: number; lng: number } {
  const found = findCity(city) ?? DEFAULT_CITY;
  return { lat: found.lat, lng: found.lng };
}

/**
 * Дневной прогноз на ближайшие 7 дней. Возвращает [] при любой проблеме
 * (нет сети, лимит, странный ответ) — вызывающий просто не покажет погоду.
 */
export async function getWeekForecast(
  city: string | null,
  lat?: number | null,
  lng?: number | null,
): Promise<DayWeather[]> {
  const coords =
    typeof lat === "number" && typeof lng === "number" ? { lat, lng } : coordsForCity(city);

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}` +
    `&daily=weather_code,temperature_2m_max&forecast_days=7&timezone=auto`;

  try {
    // Кэшируем на час: прогноз не меняется поминутно, а запросов будет много.
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      daily?: { time?: string[]; weather_code?: number[]; temperature_2m_max?: number[] };
    };

    const time = data.daily?.time;
    const codes = data.daily?.weather_code;
    const temps = data.daily?.temperature_2m_max;
    if (!time || !codes || !temps) return [];

    return time.map((date, i) => ({
      date,
      kind: kindFromCode(codes[i] ?? 0),
      tempMax: Math.round(temps[i] ?? 0),
    }));
  } catch {
    return [];
  }
}
