import { describe, expect, it } from "vitest";
import {
  dayFitsWindows,
  noveltySlots,
  preferenceWeight,
  socialBoost,
  unfamiliarRelevance,
} from "./weekly";

/*
 * Онбординг собирает «не моё», новизну, формат и свободные окна. Вопрос имеет
 * смысл, только если ответ меняет подборку, — эти тесты про то, что меняет,
 * в правильную сторону и не сильнее, чем позволяет честный сигнал.
 */

describe("preferenceWeight", () => {
  it("опускает категорию с дизлайком, но не вычёркивает её", () => {
    expect(preferenceWeight(false, true)).toBeLessThan(1);
    expect(preferenceWeight(false, true)).toBeGreaterThan(0);
  });

  it("без явного отношения и при лайке ничего не меняет", () => {
    expect(preferenceWeight(false, false)).toBe(1);
    expect(preferenceWeight(true, false)).toBe(1);
  });

  it("лайк перевешивает дизлайк", () => {
    expect(preferenceWeight(true, true)).toBe(1);
  });
});

describe("unfamiliarRelevance", () => {
  it("при новизне по умолчанию (30) сохраняет прежний вес 0.6", () => {
    expect(unfamiliarRelevance(30)).toBeCloseTo(0.6);
  });

  it("растёт вместе с новизной", () => {
    expect(unfamiliarRelevance(20)).toBeLessThan(unfamiliarRelevance(40));
    expect(unfamiliarRelevance(40)).toBeLessThan(unfamiliarRelevance(70));
  });

  it("не обгоняет любимые категории (вес 2) даже на максимуме", () => {
    expect(unfamiliarRelevance(100)).toBeLessThan(2);
  });

  it("обрезает значения вне 0..100", () => {
    expect(unfamiliarRelevance(-50)).toBe(unfamiliarRelevance(0));
    expect(unfamiliarRelevance(500)).toBe(unfamiliarRelevance(100));
  });
});

describe("noveltySlots", () => {
  it("держит за незнакомым больше мест при большей новизне", () => {
    expect(noveltySlots(0)).toBe(0);
    expect(noveltySlots(20)).toBe(1);
    expect(noveltySlots(40)).toBe(1);
    expect(noveltySlots(70)).toBe(2);
    expect(noveltySlots(100)).toBe(3);
  });

  it("не выходит за число кандидатов", () => {
    expect(noveltySlots(1000)).toBe(3);
    expect(noveltySlots(100, 2)).toBe(2);
  });
});

describe("socialBoost", () => {
  it("«новые люди» скромно поднимают события и CONNECTION", () => {
    const ev = socialBoost("NEW_PEOPLE", { kind: "EVENT", category: "CULTURE" });
    expect(ev).toBeGreaterThan(1);
    expect(ev).toBeLessThanOrEqual(1.3);
    expect(socialBoost("NEW_PEOPLE", { kind: "CHALLENGE", category: "CONNECTION" })).toBe(ev);
    expect(socialBoost("NEW_PEOPLE", { kind: "RITUAL", category: "REST" })).toBe(1);
  });

  it("«один» скромно поднимает ритуалы", () => {
    const r = socialBoost("SOLO", { kind: "RITUAL", category: "REST" });
    expect(r).toBeGreaterThan(1);
    expect(r).toBeLessThanOrEqual(1.3);
    expect(socialBoost("SOLO", { kind: "EVENT", category: "CULTURE" })).toBe(1);
  });

  it("не выдумывает признак там, где его нет", () => {
    // «С близкими» можно почти всё — честно отличить такое впечатление нечем.
    for (const kind of ["EVENT", "CHALLENGE", "RITUAL"] as const) {
      expect(socialBoost("CLOSE_ONES", { kind, category: "CONNECTION" })).toBe(1);
      expect(socialBoost(null, { kind, category: "CONNECTION" })).toBe(1);
    }
  });
});

describe("dayFitsWindows", () => {
  it("без окон не подсвечивает ни один день", () => {
    for (let d = 1; d <= 7; d++) expect(dayFitsWindows(d, [])).toBe(false);
  });

  it("будние окна подходят к пн–пт, выходные — к сб–вс", () => {
    expect(dayFitsWindows(1, ["WEEKDAY_EVENING"])).toBe(true);
    expect(dayFitsWindows(5, ["WEEKDAY_MORNING"])).toBe(true);
    expect(dayFitsWindows(6, ["WEEKDAY_EVENING"])).toBe(false);
    expect(dayFitsWindows(6, ["WEEKEND_DAY"])).toBe(true);
    expect(dayFitsWindows(7, ["WEEKEND_EVENING"])).toBe(true);
    expect(dayFitsWindows(3, ["WEEKEND_DAY"])).toBe(false);
  });
});
