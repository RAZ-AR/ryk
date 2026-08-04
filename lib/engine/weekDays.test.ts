import { describe, expect, it } from "vitest";
import { weekDaysFromToday } from "./weekDays";

/*
 * Календарная арифметика ошибается тихо, поэтому проверяем края: начало
 * недели, конец недели и воскресенье, у которого getUTCDay даёт 0.
 */

describe("weekDaysFromToday", () => {
  it("в понедельник предлагает всю неделю", () => {
    // 2026-08-03 — понедельник.
    const days = weekDaysFromToday(new Date("2026-08-03T09:00:00.000Z"));

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ iso: "2026-08-03", weekday: 1, dayOfMonth: 3 });
    expect(days[6]).toEqual({ iso: "2026-08-09", weekday: 7, dayOfMonth: 9 });
  });

  it("в четверг — только четверг и остаток недели", () => {
    const days = weekDaysFromToday(new Date("2026-08-06T21:30:00.000Z"));

    expect(days.map((d) => d.iso)).toEqual([
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
  });

  it("в воскресенье остаётся один день, а не восемь", () => {
    // Воскресенье у getUTCDay — 0; без перевода в 1…7 здесь вышло бы 7 дней вперёд.
    const days = weekDaysFromToday(new Date("2026-08-09T06:00:00.000Z"));

    expect(days).toHaveLength(1);
    expect(days[0]).toEqual({ iso: "2026-08-09", weekday: 7, dayOfMonth: 9 });
  });

  it("переходит через конец месяца", () => {
    // 2026-08-30 — воскресенье, 2026-08-27 — четверг.
    const days = weekDaysFromToday(new Date("2026-08-27T10:00:00.000Z"));

    expect(days.map((d) => d.iso)).toEqual([
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
    ]);
  });

  it("не зависит от времени суток", () => {
    const early = weekDaysFromToday(new Date("2026-08-05T00:00:01.000Z"));
    const late = weekDaysFromToday(new Date("2026-08-05T23:59:59.000Z"));

    expect(early).toEqual(late);
  });
});
