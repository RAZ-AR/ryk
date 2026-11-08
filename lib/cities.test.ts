import { describe, expect, it } from "vitest";
import { localizeCity } from "./i18n/city";
import { coordsForCity } from "./weather/openMeteo";
import { LOCALES } from "./i18n/locale";
import { CITIES, canonicalCity, cityById, findCity, localDate, normalizeCity } from "./cities";

/*
 * Главный тест здесь — последний: имя и координаты обязаны узнавать один
 * и тот же набор написаний. Когда списки были раздельными, «Ereván» шапка
 * узнавала, а погода нет, и человеку в Ереване считали прогноз по Белграду.
 * Прогноз кормит подсказку WEATHER_SWAP, то есть бот предлагал перенести
 * день по погоде чужого города.
 */

describe("normalizeCity", () => {
  it("не различает регистр, дефисы и лишние пробелы", () => {
    for (const written of ["Нови-Сад", "  нови сад  ", "НОВИ—САД", "novi  sad", "Novi-Sad"]) {
      expect(["нови сад", "novi sad"]).toContain(normalizeCity(written));
    }
  });
});

describe("findCity", () => {
  it("находит по любому известному написанию", () => {
    for (const written of ["Белград", "beograd", "BELGRADE", "Belgrado"]) {
      expect(findCity(written)?.names.ru).toBe("Белград");
    }
  });

  it("незнакомое и пустое — null", () => {
    expect(findCity("Тбилиси")).toBeNull();
    expect(findCity("")).toBeNull();
    expect(findCity(null)).toBeNull();
  });

  it("ключ из прототипа не считается городом", () => {
    // Поиск идёт по Map, а не по литералу объекта: в литерале `__proto__`
    // попал бы в прототип вместо честного промаха.
    for (const evil of ["__proto__", "constructor", "toString", "valueOf"]) {
      expect(findCity(evil)).toBeNull();
    }
  });
});

describe("localizeCity", () => {
  it("переводит пилотные города", () => {
    expect(localizeCity("Белград", "en")).toBe("Belgrade");
    expect(localizeCity("Belgrade", "ru")).toBe("Белград");
    expect(localizeCity("Нови-Сад", "en")).toBe("Novi Sad");
    expect(localizeCity("Ереван", "es")).toBe("Ereván");
  });

  it("незнакомый город отдаёт как есть", () => {
    expect(localizeCity("Кранево", "en")).toBe("Кранево");
    expect(localizeCity("  Тбилиси  ", "en")).toBe("Тбилиси");
  });

  it("пустое остаётся пустым — строку в шапке рисовать не из чего", () => {
    expect(localizeCity(null, "ru")).toBeNull();
    expect(localizeCity("   ", "ru")).toBeNull();
  });

  it("неизвестный язык откатывается на язык по умолчанию", () => {
    expect(localizeCity("Belgrade", "de")).toBe("Белград");
  });
});

describe("id, страна и пояс", () => {
  it("id уникальны и находятся обратно", () => {
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
    for (const c of CITIES) expect(cityById(c.id)).toBe(c);
    expect(cityById("tbilisi")).toBeNull();
    expect(cityById("__proto__")).toBeNull();
    expect(cityById(null)).toBeNull();
  });

  it("страна и пояс у пилотных городов", () => {
    expect(cityById("belgrade")?.country.code).toBe("RS");
    expect(cityById("novi-sad")?.country.names.en).toBe("Serbia");
    expect(cityById("yerevan")?.country.code).toBe("AM");
    expect(cityById("yerevan")?.timeZone).toBe("Asia/Yerevan");
  });

  it("каждый пояс понимает Intl — опечатка уронила бы лист на любом запросе", () => {
    for (const c of CITIES) {
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: c.timeZone })).not.toThrow();
    }
  });
});

describe("canonicalCity", () => {
  it("знакомый город — русским именем, как в каталоге", () => {
    expect(canonicalCity("  Belgrade ", 80)).toBe("Белград");
    expect(canonicalCity("novi-sad", 80)).toBe("Нови-Сад");
    expect(canonicalCity("Ereván", 80)).toBe("Ереван");
  });

  it("незнакомый сохраняется как ввели, только без пробелов и по длине", () => {
    expect(canonicalCity("  Крагуевац ", 80)).toBe("Крагуевац");
    expect(canonicalCity("x".repeat(200), 80)).toHaveLength(80);
  });

  it("пустое — null", () => {
    expect(canonicalCity("   ", 80)).toBeNull();
    expect(canonicalCity(null, 80)).toBeNull();
  });
});

describe("localDate", () => {
  const belgrade = cityById("belgrade")!;
  const yerevan = cityById("yerevan")!;

  it("один момент — разные даты: в Ереване уже завтра", () => {
    // 31 декабря, 21:30 UTC: в Белграде 22:30, в Ереване (UTC+4) — 01:30 нового года.
    const now = new Date("2025-12-31T21:30:00Z");
    expect(localDate(belgrade, now)).toEqual({ iso: "2025-12-31", weekday: 3, dayOfYear: 365 });
    expect(localDate(yerevan, now)).toEqual({ iso: "2026-01-01", weekday: 4, dayOfYear: 1 });
  });

  it("день года учитывает високосный год", () => {
    expect(localDate(belgrade, new Date("2028-12-31T12:00:00Z")).dayOfYear).toBe(366);
    expect(localDate(belgrade, new Date("2026-03-01T12:00:00Z")).dayOfYear).toBe(60);
  });

  it("воскресенье — 7, понедельник — 1", () => {
    expect(localDate(belgrade, new Date("2026-08-02T10:00:00Z")).weekday).toBe(7);
    expect(localDate(belgrade, new Date("2026-08-03T10:00:00Z")).weekday).toBe(1);
  });

  it("летнее время Белграда: 22:30 UTC летом — уже следующий день", () => {
    // Летом UTC+2, зимой UTC+1: жёсткий сдвиг ошибся бы в одном из двух случаев.
    expect(localDate(belgrade, new Date("2026-07-31T22:30:00Z")).iso).toBe("2026-08-01");
    expect(localDate(belgrade, new Date("2026-01-31T22:30:00Z")).iso).toBe("2026-01-31");
  });
});

describe("имя и координаты не расходятся", () => {
  it("каждое написание, которое узнаёт шапка, узнаёт и погода", () => {
    for (const city of CITIES) {
      for (const alias of city.aliases) {
        expect(coordsForCity(alias), `${alias} → координаты`).toEqual({
          lat: city.lat,
          lng: city.lng,
        });
        for (const locale of LOCALES) {
          expect(localizeCity(alias, locale), `${alias} → ${locale}`).toBe(city.names[locale]);
        }
      }
    }
  });

  it("написание на любом из трёх языков тоже узнаётся", () => {
    // Испанец напишет «Ereván» — и координаты должны быть ереванские,
    // а не белградские по умолчанию.
    for (const city of CITIES) {
      for (const written of Object.values(city.names)) {
        expect(coordsForCity(written), `${written} → координаты`).toEqual({
          lat: city.lat,
          lng: city.lng,
        });
      }
    }
  });

  it("незнакомый город уходит в Белград, а не падает", () => {
    expect(coordsForCity("Тбилиси")).toEqual({ lat: CITIES[0].lat, lng: CITIES[0].lng });
    expect(coordsForCity(null)).toEqual({ lat: CITIES[0].lat, lng: CITIES[0].lng });
  });
});
