import { describe, expect, it } from "vitest";
import { liveExperienceWhere, startOfTodayUTC } from "./liveExperiences";

/*
 * Общее правило «что вообще можно показывать» — им пользуются и недельные
 * кандидаты, и лента. Если оно разъедется, лента начнёт предлагать снятое
 * куратором или прошедшее.
 */

describe("liveExperienceWhere", () => {
  it("отсекает снятое куратором", () => {
    expect(liveExperienceWhere().archivedAt).toBeNull();
  });

  it("пропускает впечатления без даты и только будущие с датой", () => {
    const now = new Date("2026-07-26T15:00:00.000Z");
    const where = liveExperienceWhere(now);

    // Граница — начало сегодняшнего дня, а не «сейчас»: событие, которое
    // идёт сегодня вечером, ещё актуально.
    expect(where.OR).toEqual([
      { startTime: null },
      { startTime: { gte: new Date("2026-07-26T00:00:00.000Z") } },
    ]);
  });
});

describe("startOfTodayUTC", () => {
  it("обнуляет время, оставляя дату", () => {
    expect(startOfTodayUTC(new Date("2026-07-26T23:59:59.000Z")).toISOString()).toBe(
      "2026-07-26T00:00:00.000Z",
    );
  });
});
