import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * «Год» легко скатывается в счётчик: стоит показать пустые категории —
 * и получится список дел, который надо закрыть. Эти тесты закрепляют, что
 * мы показываем только прожитое и ничего не требуем.
 */

const findManyStory = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { weeklyStory: { findMany: (...a: unknown[]) => findManyStory(...a) } },
}));

const story = (category: string | null) => ({ experience: category ? { category } : null });

beforeEach(() => {
  vi.clearAllMocks();
  findManyStory.mockResolvedValue([]);
});

const NOW = new Date("2026-07-27T10:00:00.000Z");

describe("getYear", () => {
  it("считает прожитое по категориям и называет самую частую", async () => {
    findManyStory.mockResolvedValue([
      story("NATURE"),
      story("NATURE"),
      story("NATURE"),
      story("CULTURE"),
      story("CONNECTION"),
    ]);
    const { getYear } = await import("./year");

    const view = await getYear("me", NOW);

    expect(view.year).toBe(2026);
    expect(view.total).toBe(5);
    expect(view.top).toBe("NATURE");
    expect(view.rows.map((r) => [r.category, r.count])).toEqual([
      ["NATURE", 3],
      ["CONNECTION", 1],
      ["CULTURE", 1],
    ]);
  });

  it("не показывает категории, в которых ничего не было", async () => {
    findManyStory.mockResolvedValue([story("REST")]);
    const { getYear } = await import("./year");

    const view = await getYear("me", NOW);

    // Девять полос, из которых восемь пустые, читаются как список дел.
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0].category).toBe("REST");
  });

  it("доля считается от самой большой полосы, а не от какой-то цели", async () => {
    findManyStory.mockResolvedValue([
      story("JOY"),
      story("JOY"),
      story("JOY"),
      story("JOY"),
      story("MOVEMENT"),
    ]);
    const { getYear } = await import("./year");

    const view = await getYear("me", NOW);

    expect(view.rows[0].share).toBe(1);
    expect(view.rows[1].share).toBe(0.25);
  });

  it("пустой год не ломается и никого не упрекает", async () => {
    const { getYear } = await import("./year");

    const view = await getYear("me", NOW);

    expect(view).toMatchObject({ total: 0, rows: [], top: null });
  });

  it("берёт только прожитое за текущий год", async () => {
    const { getYear } = await import("./year");
    await getYear("me", NOW);

    const where = findManyStory.mock.calls[0][0].where;
    // Перенесённые недели не считаем: их не было.
    expect(where.memory).toEqual({ is: { deferred: false } });
    expect(where.weekStart.gte).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(where.weekStart.lt).toEqual(new Date("2027-01-01T00:00:00.000Z"));
  });

  it("истории без впечатления не попадают в счёт", async () => {
    findManyStory.mockResolvedValue([story("NATURE"), story(null)]);
    const { getYear } = await import("./year");

    const view = await getYear("me", NOW);

    expect(view.rows).toEqual([{ category: "NATURE", count: 1, share: 1 }]);
  });

  it("при равенстве порядок стабилен между запросами", async () => {
    findManyStory.mockResolvedValue([story("REST"), story("JOY"), story("CULTURE")]);
    const { getYear } = await import("./year");

    const a = await getYear("me", NOW);
    const b = await getYear("me", NOW);

    expect(a.rows.map((r) => r.category)).toEqual(b.rows.map((r) => r.category));
  });
});
