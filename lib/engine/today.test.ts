import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * «Лист дня»: сборка проверяется на чистой buildToday, а getToday — только на
 * обещание «никогда не бросает». Всё остальное — тонкие вызовы погоды и базы.
 */

const findMany = vi.fn();
const getWeekForecast = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { experience: { findMany: (...a: unknown[]) => findMany(...a) } },
}));

vi.mock("@/lib/weather/openMeteo", () => ({
  getWeekForecast: (...a: unknown[]) => getWeekForecast(...a),
}));

import { findCity, localDate } from "@/lib/cities";
import type { Moment } from "@/lib/calendar/holidays";
import { buildToday, getToday, type BuildTodayInput } from "./today";

beforeEach(() => {
  vi.clearAllMocks();
});

const BELGRADE = findCity("Белград")!;
const NOW = new Date("2026-07-15T09:00:00Z");

function input(over: Partial<BuildTodayInput> = {}): BuildTodayInput {
  return {
    userId: "user-1",
    locale: "en",
    rawCity: "Белград",
    city: BELGRADE,
    local: localDate(BELGRADE, NOW),
    timeZone: BELGRADE.timeZone,
    forecast: [
      { date: "2026-07-15", kind: "CLEAR", tempMax: 31, sunrise: "05:05", sunset: "20:25" },
      { date: "2026-07-16", kind: "RAIN", tempMax: 24 },
    ],
    moments: [],
    experience: null,
    traits: [],
    ...over,
  };
}

const moon: Moment = { date: "2026-07-29", kind: "moon", key: "moon.full" };
const solstice: Moment = { date: "2026-07-20", kind: "season", key: "season.x" };

describe("buildToday", () => {
  it("дата, место на языке человека, погода сегодняшнего дня", () => {
    const t = buildToday(input());
    expect(t).toMatchObject({
      dateIso: "2026-07-15",
      weekday: 3,
      dayOfYear: 196,
      cityName: "Belgrade",
      countryName: "Serbia",
      weather: { kind: "CLEAR", tempMax: 31, sunrise: "05:05", sunset: "20:25" },
    });
    expect(typeof t.joyKey).toBe("string");
  });

  it("нет прогноза на сегодня — погоды нет, лист не ломается", () => {
    const t = buildToday(input({ forecast: [] }));
    expect(t.weather).toBeNull();
    expect(t.joyKey).toBeTruthy();
  });

  it("незнакомый город — показываем как ввели, страны нет", () => {
    const t = buildToday(input({ city: null, rawCity: "  Тбилиси ", forecast: [] }));
    expect(t.cityName).toBe("Тбилиси");
    expect(t.countryName).toBeNull();
  });

  it("«Скоро»: ближайший момент и событие, по дате, не больше двух", () => {
    const t = buildToday(
      input({
        moments: [solstice, moon],
        experience: {
          id: "e1",
          title: "Концерт",
          translations: { en: { title: "Concert" } },
          startTime: new Date("2026-07-18T18:00:00Z"),
        },
      }),
    );
    expect(t.soon).toEqual([
      { type: "experience", date: "2026-07-18", id: "e1", title: "Concert" },
      { type: "moment", ...solstice },
    ]);
  });

  it("событие дальше тридцати дней в «Скоро» не попадает", () => {
    const t = buildToday(
      input({
        experience: { id: "e1", title: "Позже", startTime: new Date("2026-09-01T18:00:00Z") },
      }),
    );
    expect(t.soon).toEqual([]);
  });

  it("радость детерминирована", () => {
    expect(buildToday(input()).joyKey).toBe(buildToday(input()).joyKey);
  });
});

describe("getToday", () => {
  it("погода и база упали — лист всё равно собирается", async () => {
    getWeekForecast.mockRejectedValue(new Error("network"));
    findMany.mockRejectedValue(new Error("db"));
    const t = await getToday({ id: "u", city: "Belgrade", locale: "RU" }, NOW);
    expect(t.weather).toBeNull();
    expect(t.cityName).toBe("Белград");
    expect(t.soon.every((s) => s.type === "moment")).toBe(true);
  });

  it("событие в другом городе не попадает в «Скоро»", async () => {
    getWeekForecast.mockResolvedValue([]);
    findMany.mockResolvedValue([
      {
        id: "x",
        title: "Ереванское",
        translations: {},
        city: "Ереван",
        startTime: new Date("2026-07-16T10:00:00Z"),
      },
      {
        id: "y",
        title: "Белградское",
        translations: {},
        city: "Белград",
        startTime: new Date("2026-07-17T10:00:00Z"),
      },
    ]);
    const t = await getToday({ id: "u", city: "Belgrade", locale: "ru" }, NOW);
    expect(t.soon.find((s) => s.type === "experience")).toMatchObject({ id: "y" });
  });

  it("без города — ни погоды, ни запроса к базе", async () => {
    const t = await getToday({ id: "u", city: null, locale: "es" }, NOW);
    expect(getWeekForecast).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
    expect(t.cityName).toBeNull();
    expect(t.soon.every((s) => s.type === "moment" && s.kind !== "holiday")).toBe(true);
  });
});
