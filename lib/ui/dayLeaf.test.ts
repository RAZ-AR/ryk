import { describe, expect, it } from "vitest";
import { isoWeekday, soonWhen } from "./dayLeaf";

describe("soonWhen", () => {
  it("сегодня и завтра — словом", () => {
    expect(soonWhen("2026-05-12", "2026-05-12")).toEqual({ kind: "today" });
    expect(soonWhen("2026-05-12", "2026-05-13")).toEqual({ kind: "tomorrow" });
  });

  it("внутри недели — днём недели", () => {
    // 2026-05-16 — суббота.
    expect(soonWhen("2026-05-12", "2026-05-16")).toEqual({ kind: "weekday", weekday: 6 });
    expect(soonWhen("2026-05-12", "2026-05-18")).toEqual({ kind: "weekday", weekday: 1 });
  });

  it("с недели и дальше — датой, без отсчёта дней", () => {
    expect(soonWhen("2026-05-12", "2026-05-19")).toEqual({ kind: "date" });
    expect(soonWhen("2026-12-28", "2027-01-07")).toEqual({ kind: "date" });
  });

  it("через Новый год считает дни верно", () => {
    expect(soonWhen("2026-12-31", "2027-01-01")).toEqual({ kind: "tomorrow" });
  });
});

describe("isoWeekday", () => {
  it("воскресенье — 7, а не 0", () => {
    expect(isoWeekday("2026-05-17")).toBe(7);
    expect(isoWeekday("2026-05-11")).toBe(1);
  });
});
