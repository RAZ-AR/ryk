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

/** Координаты пилотных городов (ADR-006). Для остальных — Белград как дефолт. */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  белград: { lat: 44.79, lng: 20.45 },
  beograd: { lat: 44.79, lng: 20.45 },
  belgrade: { lat: 44.79, lng: 20.45 },
  "нови-сад": { lat: 45.25, lng: 19.83 },
  "нови сад": { lat: 45.25, lng: 19.83 },
  "novi sad": { lat: 45.25, lng: 19.83 },
  ереван: { lat: 40.18, lng: 44.51 },
  yerevan: { lat: 40.18, lng: 44.51 },
};

const DEFAULT_COORDS = CITY_COORDS["белград"];

/** WMO weather code → наша укрупнённая категория. */
function kindFromCode(code: number): WeatherKind {
  if (code >= 95) return "STORM";
  if (code >= 71 && code <= 86) return "SNOW";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "RAIN";
  if (code >= 1 && code <= 48) return "CLOUDY";
  return "CLEAR";
}

export function coordsForCity(city: string | null): { lat: number; lng: number } {
  if (!city) return DEFAULT_COORDS;
  return CITY_COORDS[city.trim().toLowerCase()] ?? DEFAULT_COORDS;
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
