import { describe, expect, it } from "vitest";
import { CITIES, findCity, normalizeCity } from "./cities";
import { localizeCity } from "./i18n/city";
import { coordsForCity } from "./weather/openMeteo";
import { LOCALES } from "./i18n/locale";

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
