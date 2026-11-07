import { describe, expect, it } from "vitest";
import { parseForecast } from "./openMeteo";

/*
 * Погода — украшение плана: разбор не имеет права бросать и не имеет права
 * перепутать дни. Восход и закат — необязательная добавка: без них погода
 * остаётся, просто без строки света.
 */

describe("parseForecast", () => {
  it("разбирает погоду, восход и закат в местное HH:MM", () => {
    const days = parseForecast({
      daily: {
        time: ["2026-07-31", "2026-08-01"],
        weather_code: [0, 61],
        temperature_2m_max: [24.4, 18.6],
        sunrise: ["2026-07-31T05:41", "2026-08-01T05:42"],
        sunset: ["2026-07-31T20:12", "2026-08-01T20:10"],
      },
    });
    expect(days).toEqual([
      { date: "2026-07-31", kind: "CLEAR", tempMax: 24, sunrise: "05:41", sunset: "20:12" },
      { date: "2026-08-01", kind: "RAIN", tempMax: 19, sunrise: "05:42", sunset: "20:10" },
    ]);
  });

  it("без восхода и заката — погода как раньше, без лишних ключей", () => {
    const days = parseForecast({
      daily: { time: ["2026-07-31"], weather_code: [3], temperature_2m_max: [10] },
    });
    expect(days).toEqual([{ date: "2026-07-31", kind: "CLOUDY", tempMax: 10 }]);
    expect(days[0]).not.toHaveProperty("sunrise");
  });

  it("кривое значение восхода пропускается, остальное остаётся", () => {
    const days = parseForecast({
      daily: {
        time: ["2026-07-31"],
        weather_code: [0],
        temperature_2m_max: [20],
        sunrise: [null],
        sunset: ["2026-07-31T20:12"],
      },
    });
    expect(days).toEqual([{ date: "2026-07-31", kind: "CLEAR", tempMax: 20, sunset: "20:12" }]);
  });

  it("кривая дата не сдвигает погоду соседних дней", () => {
    const days = parseForecast({
      daily: {
        time: ["2026-07-31", 42, "2026-08-02"],
        weather_code: [0, 61, 95],
        temperature_2m_max: [20, 15, 30],
      },
    });
    expect(days.map((d) => [d.date, d.kind])).toEqual([
      ["2026-07-31", "CLEAR"],
      ["2026-08-02", "STORM"],
    ]);
  });

  it("странный ответ — пусто, а не исключение", () => {
    for (const junk of [null, undefined, 42, "x", {}, { daily: null }, { daily: { time: "x" } }]) {
      expect(parseForecast(junk)).toEqual([]);
    }
  });
});
