import { getTelegramWebApp } from "./webApp";

export type Coords = { lat: number; lng: number };

/** Сколько ждём ответа: человек нажал кнопку и смотрит на «Ищем…». */
const TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), TIMEOUT_MS)),
  ]);
}

/*
 * Координаты по просьбе человека — только по нажатию кнопки, никогда сами.
 *
 * Сначала датчик Telegram (Bot API 8.0): разрешение он спрашивает своим
 * окном и запоминает для бота. Вне Telegram или в старом клиенте — обычная
 * геолокация браузера. null — нет доступа, отказ или не дождались: экран
 * предложит выбрать город руками.
 */
export function requestLocation(): Promise<Coords | null> {
  const tg = getTelegramWebApp();
  const manager = tg?.LocationManager;

  if (manager && tg?.isVersionAtLeast?.("8.0")) {
    const located = new Promise<Coords | null>((resolve) => {
      const ask = () => {
        if (!manager.isLocationAvailable) return resolve(null);
        manager.getLocation((data) =>
          resolve(data ? { lat: data.latitude, lng: data.longitude } : null),
        );
      };
      if (manager.isInited) ask();
      else manager.init(ask);
    });
    return withTimeout(located, null);
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  const located = new Promise<Coords | null>((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      // Город, а не подъезд: грубой точки и свежести в 10 минут хватает.
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 600_000 },
    ),
  );
  return withTimeout(located, null);
}
