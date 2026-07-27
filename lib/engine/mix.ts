import type { ExperienceKind } from "@/generated/prisma/enums";

/*
 * Пропорция типов в подборке.
 *
 * Зачем это вообще нужно: событий в каталоге меньшинство, но они самые
 * «свежие» по createdAt и самые заметные, поэтому любая наивная сортировка
 * скатывается к афише города. А афиша — это то, что требует денег, погоды,
 * билета и правильного города; неделя же случается у человека всегда.
 * Поэтому долю событий ограничиваем сверху явно, а не надеемся на скоринг.
 *
 * Функции здесь чистые: перемешивание детерминированное по seed, чтобы лента
 * не прыгала при каждом рендере и чтобы её можно было проверить тестом.
 */

/** Верхняя граница доли событий в подборке. Остальное — вызовы и ритуалы. */
export const EVENT_SHARE = 0.25;

/** 32-битный хеш строки — чтобы получить число из userId и даты. */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — маленький детерминированный PRNG, хватает для перемешивания. */
function makeRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Тасование Фишера–Йетса на детерминированном PRNG. Исходный массив не трогаем. */
export function shuffleSeeded<T>(items: readonly T[], seed: string): T[] {
  const out = items.slice();
  const random = makeRandom(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Собирает подборку из не более чем `limit` позиций, где событий — не больше
 * доли EVENT_SHARE, а остальное занимают вызовы и ритуалы.
 *
 * Если чего-то не хватает (например, событий в городе нет вовсе), недостача
 * добирается другим типом: пустая лента хуже, чем лента без событий.
 * События раскладываются равномерно, а не свалкой в начале.
 */
export function mixByKind<T extends { kind: ExperienceKind }>(
  items: readonly T[],
  limit: number,
  seed: string,
): T[] {
  const shuffled = shuffleSeeded(items, seed);
  const events = shuffled.filter((i) => i.kind === "EVENT");
  const rest = shuffled.filter((i) => i.kind !== "EVENT");

  const size = Math.min(limit, items.length);
  const eventQuota = Math.min(Math.round(size * EVENT_SHARE), events.length);
  // Недостачу вызовов и ритуалов добираем событиями, и наоборот.
  const takeRest = Math.min(size - eventQuota, rest.length);
  const takeEvents = Math.min(size - takeRest, events.length);

  const pickedEvents = events.slice(0, takeEvents);
  const pickedRest = rest.slice(0, takeRest);

  if (pickedEvents.length === 0) return pickedRest;
  if (pickedRest.length === 0) return pickedEvents;

  // Раскладываем события равномерно: шаг = сколько «остального» между ними.
  const step = (pickedRest.length + pickedEvents.length) / pickedEvents.length;
  const out: T[] = [];
  let restIndex = 0;
  let eventIndex = 0;

  for (let slot = 0; slot < pickedEvents.length + pickedRest.length; slot += 1) {
    const isEventSlot = eventIndex < pickedEvents.length && Math.floor(eventIndex * step) === slot;
    if (isEventSlot) {
      out.push(pickedEvents[eventIndex]);
      eventIndex += 1;
    } else if (restIndex < pickedRest.length) {
      out.push(pickedRest[restIndex]);
      restIndex += 1;
    } else {
      out.push(pickedEvents[eventIndex]);
      eventIndex += 1;
    }
  }

  return out;
}

/**
 * Seed, стабильный внутри одного дня: лента не перетасовывается при каждом
 * открытии приложения, но к завтрашнему дню обновляется сама.
 */
export function dailySeed(userId: string, now: Date = new Date()): string {
  return `${userId}:${now.toISOString().slice(0, 10)}`;
}
