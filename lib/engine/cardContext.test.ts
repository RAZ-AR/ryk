import { describe, expect, it } from "vitest";
import {
  cardReason,
  cardWhen,
  fitsFreeWindow,
  localParts,
  type ContextExperience,
  type ContextProfile,
} from "./cardContext";

const profile = (over: Partial<ContextProfile> = {}): ContextProfile => ({
  budgetMax: null,
  radiusKm: 30,
  mainBarrier: null,
  freeWindows: [],
  timezone: "Europe/Belgrade",
  liked: new Set(),
  feltGood: new Set(),
  ...over,
});

const exp = (over: Partial<ContextExperience> = {}): ContextExperience => ({
  category: "CULTURE",
  kind: "EVENT",
  price: 1500,
  durationMin: 120,
  distanceKm: null,
  startTime: null,
  ...over,
});

describe("localParts", () => {
  it("переводит момент в пояс человека", () => {
    // 21 ноября 2026, 18:00 UTC — в Белграде 19:00, суббота.
    const p = localParts(new Date("2026-11-21T18:00:00Z"), "Europe/Belgrade");
    expect(p).toEqual({ date: "2026-11-21", hour: 19, minute: 0, weekday: 6 });
  });

  it("поздний вечер по UTC — уже завтра в Ереване", () => {
    expect(localParts(new Date("2026-11-21T21:30:00Z"), "Asia/Yerevan").date).toBe("2026-11-22");
  });

  it("незнакомый пояс не роняет ленту", () => {
    expect(localParts(new Date("2026-11-21T18:00:00Z"), "Mars/Olympus").hour).toBe(18);
  });
});

describe("fitsFreeWindow", () => {
  const sat19 = new Date("2026-11-21T18:00:00Z");
  const wed10 = new Date("2026-11-18T09:00:00Z");
  const wed14 = new Date("2026-11-18T13:00:00Z");

  it("субботний вечер попадает в вечер выходного, но не в день", () => {
    expect(fitsFreeWindow(sat19, "Europe/Belgrade", ["WEEKEND_EVENING"])).toBe(true);
    expect(fitsFreeWindow(sat19, "Europe/Belgrade", ["WEEKEND_DAY"])).toBe(false);
  });

  it("будний день в рабочие часы не подходит ни под одно окно", () => {
    expect(fitsFreeWindow(wed10, "Europe/Belgrade", ["WEEKDAY_MORNING"])).toBe(true);
    expect(fitsFreeWindow(wed14, "Europe/Belgrade", ["WEEKDAY_MORNING", "WEEKDAY_EVENING"])).toBe(
      false,
    );
  });

  it("событие без часа ни в какое окно не попадает", () => {
    const midnight = new Date("2026-11-20T23:00:00Z"); // 00:00 в Белграде
    expect(fitsFreeWindow(midnight, "Europe/Belgrade", ["WEEKEND_DAY", "WEEKEND_EVENING"])).toBe(
      false,
    );
  });
});

describe("cardReason", () => {
  it("нет честной причины — нет строки", () => {
    expect(cardReason(profile(), exp())).toBeNull();
  });

  it("обход препятствия важнее всего остального", () => {
    const p = profile({ mainBarrier: "NO_TIME", liked: new Set(["CULTURE"]) });
    expect(cardReason(p, exp({ durationMin: 45 }))).toEqual({ code: "SHORT" });
    // Длинное препятствие не обходит — дальше по списку.
    expect(cardReason(p, exp({ durationMin: 180 }))).toEqual({
      code: "LIKED_CATEGORY",
      category: "CULTURE",
    });
  });

  it("дорого → бесплатное; нет сил → ритуал", () => {
    expect(cardReason(profile({ mainBarrier: "TOO_EXPENSIVE" }), exp({ price: 0 }))).toEqual({
      code: "FREE",
    });
    expect(cardReason(profile({ mainBarrier: "NO_ENERGY" }), exp({ kind: "RITUAL" }))).toEqual({
      code: "LOW_ENERGY",
    });
  });

  it("прожитое с эмоцией сильнее заявленного интереса", () => {
    const p = profile({ liked: new Set(["NATURE"]), feltGood: new Set(["NATURE"]) });
    expect(cardReason(p, exp({ category: "NATURE" }))).toEqual({
      code: "FELT_GOOD",
      category: "NATURE",
    });
  });

  it("событие в свободное время", () => {
    const p = profile({ freeWindows: ["WEEKEND_EVENING"] });
    expect(cardReason(p, exp({ startTime: new Date("2026-11-21T18:00:00Z") }))).toEqual({
      code: "FITS_WINDOW",
    });
  });

  it("рядом — только с известным расстоянием и в радиусе", () => {
    expect(cardReason(profile(), exp({ distanceKm: 3.4 }))).toEqual({ code: "NEARBY", km: 3 });
    expect(cardReason(profile(), exp({ distanceKm: 0.2 }))).toEqual({ code: "NEARBY", km: 1 });
    expect(cardReason(profile({ radiusKm: 10 }), exp({ distanceKm: 40 }))).toBeNull();
  });

  it("в бюджете — только платное", () => {
    const p = profile({ budgetMax: 2000 });
    expect(cardReason(p, exp({ price: 1500 }))).toEqual({ code: "IN_BUDGET" });
    expect(cardReason(p, exp({ price: 0 }))).toBeNull();
    expect(cardReason(p, exp({ price: 5000 }))).toBeNull();
  });
});

describe("cardWhen", () => {
  const forecast = new Map([["2026-11-21", { kind: "CLEAR" as const, tempMax: 14 }]]);
  const now = new Date("2026-11-20T10:00:00Z"); // пятница

  it("без даты — без метки", () => {
    expect(cardWhen(exp(), "Europe/Belgrade", forecast, now)).toBeNull();
  });

  it("дата и час в поясе человека", () => {
    const e = exp({ startTime: new Date("2026-11-21T18:00:00Z") });
    expect(cardWhen(e, "Europe/Belgrade", forecast, now)).toEqual({
      date: "2026-11-21",
      rel: { kind: "tomorrow" },
      time: "19:00",
      weather: null, // культура — под крышей, погода не нужна
    });
  });

  it("погода — только уличным категориям", () => {
    const e = exp({ category: "NATURE", startTime: new Date("2026-11-21T08:00:00Z") });
    expect(cardWhen(e, "Europe/Belgrade", forecast, now)?.weather).toEqual({
      kind: "CLEAR",
      tempMax: 14,
    });
  });

  it("полночь — время не задано", () => {
    const e = exp({ startTime: new Date("2026-11-20T23:00:00Z") });
    expect(cardWhen(e, "Europe/Belgrade", forecast, now)?.time).toBeNull();
  });
});
