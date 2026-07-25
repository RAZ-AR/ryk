import { describe, expect, it } from "vitest";
import { buildNudge } from "./nudges";
import type { DayWeather } from "@/lib/weather/openMeteo";

const w = (date: string, kind: DayWeather["kind"], tempMax = 20): DayWeather => ({
  date,
  kind,
  tempMax,
});

const TODAY = "2026-07-25";

describe("buildNudge", () => {
  it("при дожде предлагает ближайший день без осадков", () => {
    const res = buildNudge({
      plannedFor: "2026-07-26",
      forecast: [w(TODAY, "RAIN"), w("2026-07-26", "RAIN"), w("2026-07-27", "CLEAR")],
      socialMode: "SOLO",
      companionName: null,
      todayIso: TODAY,
    });
    expect(res.code).toBe("WEATHER_SWAP");
    expect(res.suggestedDate).toBe("2026-07-27");
  });

  it("не предлагает прошедшие дни как замену", () => {
    // Хороший день был вчера — он не должен попасть в предложение.
    const res = buildNudge({
      plannedFor: "2026-07-26",
      forecast: [w("2026-07-24", "CLEAR"), w(TODAY, "STORM"), w("2026-07-26", "STORM")],
      socialMode: "SOLO",
      companionName: null,
      todayIso: TODAY,
    });
    expect(res.code).toBe("WEATHER_WATCH");
    expect(res.suggestedDate).toBeUndefined();
  });

  it("сегодня и завтра распознаёт отдельно", () => {
    const base = { forecast: [], socialMode: null, companionName: null, todayIso: TODAY };
    expect(buildNudge({ ...base, plannedFor: TODAY }).code).toBe("TODAY");
    expect(buildNudge({ ...base, plannedFor: "2026-07-26" }).code).toBe("TOMORROW");
  });

  it("предлагает позвать человека, если компания не названа", () => {
    const res = buildNudge({
      plannedFor: "2026-07-30",
      forecast: [w("2026-07-30", "CLEAR")],
      socialMode: "CLOSE_ONES",
      companionName: null,
      todayIso: TODAY,
    });
    expect(res.code).toBe("INVITE_SOMEONE");
  });

  it("не зовёт никого, если идёшь один", () => {
    const res = buildNudge({
      plannedFor: "2026-07-30",
      forecast: [w("2026-07-30", "CLEAR")],
      socialMode: "SOLO",
      companionName: null,
      todayIso: TODAY,
    });
    expect(res.code).toBe("ON_TRACK");
  });

  it("считает дни до события", () => {
    const res = buildNudge({
      plannedFor: "2026-07-30",
      forecast: [],
      socialMode: null,
      companionName: null,
      todayIso: TODAY,
    });
    expect(res.daysLeft).toBe(5);
  });

  it("без выбранного дня не падает", () => {
    const res = buildNudge({
      plannedFor: null,
      forecast: [],
      socialMode: null,
      companionName: null,
      todayIso: TODAY,
    });
    expect(res.daysLeft).toBeNull();
    expect(res.code).toBe("ON_TRACK");
  });

  it("молчит про погоду, если прогноза нет", () => {
    const res = buildNudge({
      plannedFor: "2026-07-30",
      forecast: [],
      socialMode: "SOLO",
      companionName: null,
      todayIso: TODAY,
    });
    expect(res.code).toBe("ON_TRACK");
  });
});
