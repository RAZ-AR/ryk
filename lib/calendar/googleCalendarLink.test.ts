import { describe, expect, it } from "vitest";
import { buildGoogleCalendarUrl } from "./googleCalendarLink";

describe("buildGoogleCalendarUrl", () => {
  it("строит all-day ссылку: dates — дата и следующий день", () => {
    const url = buildGoogleCalendarUrl({ title: "Каякинг на Аде", dateISO: "2026-07-27" });
    const params = new URL(url).searchParams;

    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(true);
    expect(params.get("action")).toBe("TEMPLATE");
    expect(params.get("dates")).toBe("20260727/20260728");
    expect(params.get("text")).toBe("Каякинг на Аде");
  });

  it("не добавляет details/location, если их нет", () => {
    const url = buildGoogleCalendarUrl({ title: "Прогулка", dateISO: "2026-07-27" });
    const params = new URL(url).searchParams;

    expect(params.has("details")).toBe(false);
    expect(params.has("location")).toBe(false);
  });

  it("добавляет details/location, если переданы", () => {
    const url = buildGoogleCalendarUrl({
      title: "Ужин",
      dateISO: "2026-07-27",
      details: "Общий стол",
      location: "Дорћол",
    });
    const params = new URL(url).searchParams;

    expect(params.get("details")).toBe("Общий стол");
    expect(params.get("location")).toBe("Дорћол");
  });
});
