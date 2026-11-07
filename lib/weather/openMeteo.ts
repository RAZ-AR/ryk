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
  /**
   * Восход и закат, местное «HH:MM» — для строки света на «Листе дня».
   * Необязательны: нет в ответе (полярный день, странный формат) — строки
   * просто не будет, а погода останется.
   */
  sunrise?: string;
  sunset?: string;
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
 * Пояс для запроса. Знакомый город — его IANA-пояс: даты и восход придут
 * в том же времени, в котором «Лист дня» считает «сегодня» (localDate). Иначе
 * auto: Open-Meteo сам возьмёт пояс по координатам — лучше, чем подставить
 * белградский незнакомому городу.
 */
function timeZoneParam(city: string | null): string {
  return encodeURIComponent(findCity(city)?.timeZone ?? "auto");
}

/** «2026-07-31T05:41» → «05:41»; всё, что не похоже на время, — undefined. */
function clockTime(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const m = /T(\d{2}:\d{2})/.exec(value);
  return m?.[1];
}

/**
 * Разбор ответа Open-Meteo отдельно от сети — чтобы его можно было
 * проверить тестом. Не бросает: на любой непонятный ответ — [].
 */
export function parseForecast(json: unknown): DayWeather[] {
  if (typeof json !== "object" || json === null) return [];
  const daily = (json as { daily?: unknown }).daily;
  if (typeof daily !== "object" || daily === null) return [];
  const d = daily as {
    time?: unknown;
    weather_code?: unknown;
    temperature_2m_max?: unknown;
    sunrise?: unknown;
    sunset?: unknown;
  };

  const time = d.time;
  const codes = d.weather_code;
  const temps = d.temperature_2m_max;
  if (!Array.isArray(time) || !Array.isArray(codes) || !Array.isArray(temps)) return [];
  const sunrise = Array.isArray(d.sunrise) ? d.sunrise : [];
  const sunset = Array.isArray(d.sunset) ? d.sunset : [];

  // flatMap по исходному индексу, а не filter+map: после filter индексы съехали
  // бы, и кривая дата в середине присвоила бы чужую погоду всем следующим дням.
  return time.flatMap((date: unknown, i): DayWeather[] => {
    if (typeof date !== "string") return [];
    const code = codes[i];
    const temp = temps[i];
    const day: DayWeather = {
      date,
      kind: kindFromCode(typeof code === "number" ? code : 0),
      tempMax: Math.round(typeof temp === "number" ? temp : 0),
    };
    // Поля добавляем, только когда есть значение: undefined-ключи
    // ломали бы toEqual в старых тестах и сериализацию в клиент.
    const rise = clockTime(sunrise[i]);
    const set = clockTime(sunset[i]);
    if (rise) day.sunrise = rise;
    if (set) day.sunset = set;
    return [day];
  });
}

/**
 * Дневной прогноз на ближайшие 7 дней. Возвращает [] при любой проблеме
 * (нет сети, лимит, странный ответ) — вызывающий просто не покажет погоду.
 *
 * Восход и закат берём тем же запросом: второй запрос ради двух чисел
 * удвоил бы нагрузку на бесплатный лимит Open-Meteo.
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
    `&daily=weather_code,temperature_2m_max,sunrise,sunset&forecast_days=7` +
    `&timezone=${timeZoneParam(city)}`;

  try {
    // Кэшируем на час: прогноз не меняется поминутно, а запросов будет много.
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return parseForecast(await res.json());
  } catch {
    return [];
  }
}
