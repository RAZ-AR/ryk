import { describe, expect, it } from "vitest";
import { localizeCity } from "./city";

/*
 * Город — свободный ввод, и главное здесь не перевод, а то, что незнакомое
 * название доходит до экрана нетронутым. Потерять то, что человек напечатал,
 * хуже, чем показать это не на том языке.
 */

describe("localizeCity", () => {
  it("переводит пилотные города", () => {
    expect(localizeCity("Белград", "en")).toBe("Belgrade");
    expect(localizeCity("Belgrade", "ru")).toBe("Белград");
    expect(localizeCity("Нови-Сад", "en")).toBe("Novi Sad");
    expect(localizeCity("Ереван", "es")).toBe("Ereván");
  });

  it("узнаёт город независимо от регистра, дефиса и пробелов", () => {
    for (const written of ["нови-сад", "  Нови Сад  ", "НОВИ—САД", "novi  sad"]) {
      expect(localizeCity(written, "en")).toBe("Novi Sad");
    }
  });

  it("незнакомый город отдаёт как есть", () => {
    expect(localizeCity("Кранево", "en")).toBe("Кранево");
    expect(localizeCity("  Тбилиси  ", "en")).toBe("Тбилиси");
  });

  it("пустое остаётся пустым — строку в шапке рисовать не из чего", () => {
    expect(localizeCity(null, "ru")).toBeNull();
    expect(localizeCity("", "ru")).toBeNull();
    expect(localizeCity("   ", "ru")).toBeNull();
  });

  it("неизвестный язык не роняет — откатывается на язык по умолчанию", () => {
    expect(localizeCity("Belgrade", "de")).toBe("Белград");
  });
});
