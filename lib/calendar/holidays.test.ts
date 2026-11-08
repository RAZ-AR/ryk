import { describe, expect, it } from "vitest";
import ru from "@/messages/ru.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { CITIES } from "@/lib/cities";
import { allMomentKeys, orthodoxEaster, upcomingMoments } from "./holidays";

/*
 * Строка «Скоро» на «Листе дня». Самое хрупкое здесь — Пасха (считается, а не
 * зашита) и порядок: экран берёт первый момент, и неверная сортировка
 * показала бы полнолуние вместо Божича.
 */

describe("orthodoxEaster", () => {
  it("совпадает с известными датами", () => {
    expect(orthodoxEaster(2025)).toBe("2025-04-20");
    expect(orthodoxEaster(2026)).toBe("2026-04-12");
    expect(orthodoxEaster(2027)).toBe("2027-05-02");
  });
});

describe("upcomingMoments", () => {
  it("Сербия: пасхальные дни с пятницы по понедельник", () => {
    const keys = upcomingMoments("RS", "2026-04-09", 6)
      .filter((m) => m.kind === "holiday")
      .map((m) => `${m.date} ${m.key}`);
    expect(keys).toEqual([
      "2026-04-10 rs.goodFriday",
      "2026-04-11 rs.holySaturday",
      "2026-04-12 rs.easter",
      "2026-04-13 rs.easterMonday",
    ]);
  });

  it("Армения: 24 апреля — тихий день памяти", () => {
    const m = upcomingMoments("AM", "2026-04-20", 10).find((x) => x.key === "am.remembrance");
    expect(m).toMatchObject({ date: "2026-04-24", kind: "holiday", quiet: true });
  });

  it("отсортированы по дате и не выходят за окно", () => {
    const list = upcomingMoments("RS", "2026-01-01", 365);
    const dates = list.map((m) => m.date);
    expect(dates).toEqual([...dates].sort());
    // Все даты внутри окна.
    expect(dates[0] >= "2026-01-01").toBe(true);
    expect(dates.at(-1)! < "2027-01-01").toBe(true);
  });

  it("окно через Новый год захватывает праздники следующего года", () => {
    const keys = upcomingMoments("AM", "2026-12-25", 14).map((m) => m.key);
    expect(keys).toContain("am.newYearsEve");
    expect(keys).toContain("am.newYear");
    expect(keys).toContain("am.christmas");
  });

  it("незнакомая страна — только сезоны и луна", () => {
    const list = upcomingMoments(null, "2026-01-01", 365);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((m) => m.kind !== "holiday")).toBe(true);
    expect(list.filter((m) => m.kind === "season")).toHaveLength(8);
  });

  it("полнолуние примерно раз в синодический месяц и близко к настоящему", () => {
    const moons = upcomingMoments(null, "2026-01-01", 365).filter((m) => m.kind === "moon");
    expect(moons.length).toBeGreaterThanOrEqual(12);
    expect(moons.length).toBeLessThanOrEqual(13);
    // Настоящее полнолуние — 3 января 2026; среднее может уехать на день.
    expect(["2026-01-02", "2026-01-03", "2026-01-04"]).toContain(moons[0].date);
  });

  it("у каждой страны из списка городов есть праздники", () => {
    // Тип ловит забытый календарь при сборке; тест — пустой календарь.
    for (const city of CITIES) {
      const holidays = upcomingMoments(city.country.code, "2026-01-01", 365).filter(
        (m) => m.kind === "holiday",
      );
      expect(holidays.length, city.id).toBeGreaterThan(5);
    }
  });

  it("пустое окно — пустой список", () => {
    expect(upcomingMoments("RS", "2026-01-01", 0)).toEqual([]);
  });
});

describe("переводы моментов", () => {
  it("у каждого ключа есть текст на всех языках", () => {
    for (const messages of [ru, en, es]) {
      for (const key of allMomentKeys()) {
        const [group, name] = key.split(".");
        const table = (messages.moments as Record<string, Record<string, string>>)[group];
        expect(table?.[name], key).toBeTruthy();
      }
    }
  });
});
