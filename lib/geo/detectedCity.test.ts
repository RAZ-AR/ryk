import { describe, expect, it } from "vitest";
import { parseDetectedCity, UNKNOWN_PLACE } from "./detectedCity";

/*
 * Главное здесь — что промах остаётся промахом. Соблазн подставить
 * столицу пилота на любой непонятный ввод уже однажды реализовался
 * в погоде (см. lib/cities.ts), и цена была: человеку в Ереване бот
 * советовал перенести день по белградскому прогнозу.
 */

describe("parseDetectedCity", () => {
  it("узнаёт город пилота", () => {
    expect(parseDetectedCity("Belgrade").city?.names.ru).toBe("Белград");
  });

  it("раскодирует percent-encoding, которым Vercel шлёт пробелы", () => {
    const place = parseDetectedCity("Novi%20Sad");
    expect(place.raw).toBe("Novi Sad");
    expect(place.city?.names.ru).toBe("Нови-Сад");
  });

  it("узнаёт город на любом языке интерфейса", () => {
    for (const written of ["Ereván", "Yerevan", "%D0%95%D1%80%D0%B5%D0%B2%D0%B0%D0%BD"]) {
      expect(parseDetectedCity(written).city?.names.en).toBe("Yerevan");
    }
  });

  it("город вне пилота отдаёт как есть, а не как город пилота", () => {
    const place = parseDetectedCity("Barcelona");
    expect(place.city).toBeNull();
    expect(place.raw).toBe("Barcelona");
  });

  it("пустой и отсутствующий заголовок — не город", () => {
    for (const value of [null, undefined, "", "   "]) {
      expect(parseDetectedCity(value)).toEqual(UNKNOWN_PLACE);
    }
  });

  it("битый percent-encoding не превращается в город", () => {
    // Одинокий «%» роняет decodeURIComponent. Заголовок мог испортить
    // прокси — знать неправду хуже, чем не знать ничего.
    expect(parseDetectedCity("Bel%grade")).toEqual(UNKNOWN_PLACE);
  });
});
