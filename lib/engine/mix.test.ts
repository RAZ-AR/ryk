import { describe, expect, it } from "vitest";
import type { ExperienceKind } from "@/generated/prisma/enums";
import { EVENT_SHARE, dailySeed, mixByKind, shuffleSeeded } from "./mix";

/*
 * Смысл этих тестов — защитить продуктовое правило, а не реализацию:
 * лента не должна превращаться в афишу города.
 */

const make = (kind: ExperienceKind, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `${kind}-${i}`, kind }));

describe("mixByKind", () => {
  it("держит долю событий не выше четверти", () => {
    const items = [...make("EVENT", 40), ...make("CHALLENGE", 40), ...make("RITUAL", 40)];

    const deck = mixByKind(items, 20, "seed");

    expect(deck).toHaveLength(20);
    const events = deck.filter((i) => i.kind === "EVENT").length;
    expect(events).toBeLessThanOrEqual(Math.round(20 * EVENT_SHARE));
  });

  it("не сваливает события в начало, а раскладывает по ленте", () => {
    const items = [...make("EVENT", 10), ...make("CHALLENGE", 30)];

    const deck = mixByKind(items, 20, "seed");
    const positions = deck.flatMap((item, index) => (item.kind === "EVENT" ? [index] : []));

    // Все события в первой трети ленты — это как раз то, чего мы избегаем.
    expect(Math.max(...positions)).toBeGreaterThan(deck.length / 2);
  });

  it("добирает вызовами, когда событий в каталоге нет вовсе", () => {
    const deck = mixByKind(make("RITUAL", 12), 10, "seed");

    // Пустая лента хуже, чем лента без событий.
    expect(deck).toHaveLength(10);
    expect(deck.every((i) => i.kind === "RITUAL")).toBe(true);
  });

  it("добирает событиями, когда больше ничего не осталось", () => {
    const deck = mixByKind(make("EVENT", 8), 10, "seed");

    expect(deck).toHaveLength(8);
  });

  it("не теряет и не дублирует позиции", () => {
    const items = [...make("EVENT", 6), ...make("CHALLENGE", 9), ...make("RITUAL", 5)];

    const deck = mixByKind(items, 20, "seed");

    expect(deck).toHaveLength(20);
    expect(new Set(deck.map((i) => i.id)).size).toBe(20);
  });

  it("на один seed даёт один и тот же порядок", () => {
    const items = [...make("EVENT", 6), ...make("CHALLENGE", 20)];

    const a = mixByKind(items, 15, "user-1:2026-07-27");
    const b = mixByKind(items, 15, "user-1:2026-07-27");
    const other = mixByKind(items, 15, "user-1:2026-07-28");

    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
    // Назавтра подборка обновляется сама, без ручного вмешательства.
    expect(a.map((i) => i.id)).not.toEqual(other.map((i) => i.id));
  });
});

describe("shuffleSeeded", () => {
  it("не мутирует исходный массив", () => {
    const items = [1, 2, 3, 4, 5];
    shuffleSeeded(items, "seed");
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("dailySeed", () => {
  it("одинаков в течение дня и меняется на следующий", () => {
    const morning = dailySeed("u1", new Date("2026-07-27T06:00:00.000Z"));
    const evening = dailySeed("u1", new Date("2026-07-27T23:00:00.000Z"));
    const tomorrow = dailySeed("u1", new Date("2026-07-28T06:00:00.000Z"));

    expect(morning).toBe(evening);
    expect(morning).not.toBe(tomorrow);
  });

  it("у разных людей разный", () => {
    const now = new Date("2026-07-27T06:00:00.000Z");
    expect(dailySeed("u1", now)).not.toBe(dailySeed("u2", now));
  });
});
