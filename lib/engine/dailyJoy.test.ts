import { describe, expect, it } from "vitest";
import ru from "@/messages/ru.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { addDaysIso } from "@/lib/calendar/holidays";
import { JOYS, pickJoy, seasonOf, type JoyInput } from "./dailyJoy";

/*
 * Радость дня обещает две вещи: перезагрузка её не меняет, и она не
 * предлагает того, что сегодня неуместно (скамейка в парке под ливнем).
 */

const BASE: JoyInput = {
  dateIso: "2026-07-15",
  userId: "user-1",
  season: "summer",
  weather: "CLEAR",
  weekday: 3,
  sunset: "20:31",
};

describe("pickJoy", () => {
  it("одинаковый вход — одинаковая радость", () => {
    expect(pickJoy(BASE)).toEqual(pickJoy({ ...BASE }));
  });

  it("в разные дни обычно разная", () => {
    const keys = Array.from({ length: 30 }, (_, i) => {
      const dateIso = addDaysIso(BASE.dateIso, i);
      return pickJoy({ ...BASE, dateIso }).key;
    });
    expect(new Set(keys).size).toBeGreaterThanOrEqual(12);
  });

  it("у разных людей в один день — не всегда одна и та же", () => {
    const keys = Array.from({ length: 20 }, (_, i) => pickJoy({ ...BASE, userId: `u${i}` }).key);
    expect(new Set(keys).size).toBeGreaterThan(1);
  });

  it("под дождём и грозой никогда не предлагает уличное", () => {
    const outdoor = new Set(JOYS.filter((j) => j.outdoor).map((j) => j.key));
    for (const weather of ["RAIN", "STORM"] as const) {
      for (let i = 0; i < 200; i++) {
        const dateIso = addDaysIso("2026-01-01", i);
        const key = pickJoy({
          ...BASE,
          dateIso,
          season: seasonOf(dateIso),
          weekday: (i % 7) + 1,
          weather,
        }).key;
        expect(outdoor.has(key), `${weather} ${dateIso} → ${key}`).toBe(false);
      }
    }
  });

  it("без погоды тоже не выводит на улицу: не знаем, что не льёт", () => {
    const outdoor = new Set(JOYS.filter((j) => j.outdoor).map((j) => j.key));
    for (let i = 0; i < 100; i++) {
      const key = pickJoy({ ...BASE, weather: null, userId: `u${i}` }).key;
      expect(outdoor.has(key)).toBe(false);
    }
  });

  it("сезонная радость не приходит не в свой сезон", () => {
    for (let i = 0; i < 100; i++) {
      const key = pickJoy({ ...BASE, season: "winter", userId: `u${i}` }).key;
      const joy = JOYS.find((j) => j.key === key)!;
      if (joy.seasons) expect(joy.seasons).toContain("winter");
    }
  });

  it("закат — с временем в параметрах, без заката не выпадает", () => {
    for (let i = 0; i < 300; i++) {
      const picked = pickJoy({ ...BASE, userId: `u${i}` });
      if (picked.key === "sunsetToEnd") expect(picked.params).toEqual({ time: "20:31" });
      const noSunset = pickJoy({ ...BASE, userId: `u${i}`, sunset: null });
      expect(noSunset.key).not.toBe("sunsetToEnd");
    }
  });

  it("черты повышают вес своих радостей", () => {
    const musical = new Set(JOYS.filter((j) => j.traits?.includes("music")).map((j) => j.key));
    const count = (traits: string[]) =>
      Array.from(
        { length: 400 },
        (_, i) => pickJoy({ ...BASE, userId: `u${i}`, traits }).key,
      ).filter((k) => musical.has(k)).length;
    expect(count(["music"])).toBeGreaterThan(count([]));
  });
});

describe("каталог радостей", () => {
  it("больше тридцати, ключи уникальны", () => {
    expect(JOYS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(JOYS.map((j) => j.key)).size).toBe(JOYS.length);
  });

  it("у каждой радости есть текст на всех языках", () => {
    for (const messages of [ru, en, es]) {
      const table = messages.joy as Record<string, string>;
      for (const joy of JOYS) expect(table[joy.key], joy.key).toBeTruthy();
    }
  });
});

describe("seasonOf", () => {
  it("метеорологические сезоны", () => {
    expect(seasonOf("2026-12-01")).toBe("winter");
    expect(seasonOf("2026-02-28")).toBe("winter");
    expect(seasonOf("2026-03-01")).toBe("spring");
    expect(seasonOf("2026-08-31")).toBe("summer");
    expect(seasonOf("2026-09-01")).toBe("autumn");
  });
});
