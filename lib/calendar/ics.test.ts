import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

/*
 * Только правила, которые легко сломать: событие на весь день (не на час —
 * plannedFor в базе не хранит реальное время), и экранирование спецсимволов
 * по RFC 5545 (запятая/точка с запятой в названии — обычное дело для событий).
 */

describe("buildIcs", () => {
  it("собирает all-day событие: DTEND — следующий день, не тот же час", () => {
    const ics = buildIcs({ uid: "story-1@ryk", title: "Каякинг на Аде", dateISO: "2026-07-27" });

    expect(ics).toContain("DTSTART;VALUE=DATE:20260727");
    expect(ics).toContain("DTEND;VALUE=DATE:20260728");
    expect(ics).not.toMatch(/DTSTART:\d{8}T/);
  });

  it("переносит месяц/год на границе (31 декабря)", () => {
    const ics = buildIcs({ uid: "x@ryk", title: "Х", dateISO: "2026-12-31" });
    expect(ics).toContain("DTEND;VALUE=DATE:20270101");
  });

  it("экранирует запятые, точки с запятой и переносы строк в тексте", () => {
    const ics = buildIcs({
      uid: "x@ryk",
      title: "Ужин, вино; разговоры",
      dateISO: "2026-07-27",
      description: "Первая строка\nвторая строка",
      location: "Кафе; У Милана",
    });

    expect(ics).toContain("SUMMARY:Ужин\\, вино\\; разговоры");
    expect(ics).toContain("DESCRIPTION:Первая строка\\nвторая строка");
    expect(ics).toContain("LOCATION:Кафе\\; У Милана");
  });

  it("не пишет DESCRIPTION/LOCATION, если их нет", () => {
    const ics = buildIcs({ uid: "x@ryk", title: "Прогулка", dateISO: "2026-07-27" });
    expect(ics).not.toContain("DESCRIPTION");
    expect(ics).not.toContain("LOCATION");
  });

  it("использует CRLF — часть клиентов не понимает голый \\n", () => {
    const ics = buildIcs({ uid: "x@ryk", title: "Прогулка", dateISO: "2026-07-27" });
    expect(ics).toContain("\r\n");
  });
});
