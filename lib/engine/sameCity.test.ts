import { describe, expect, it } from "vitest";
import { sameCity } from "./weekly";

/*
 * Подбор недели отсекает «далёкое» по городу. Пока сравнение было строковым,
 * человек с «Belgrade» в профиле не совпадал ни с одним впечатлением каталога
 * («Белград») — и вся подборка тихо считалась неосуществимой.
 */

describe("sameCity", () => {
  it("знакомый город совпадает в любом написании и на любом языке", () => {
    expect(sameCity("Белград", "Belgrade")).toBe(true);
    expect(sameCity("beograd", "Belgrado")).toBe(true);
    expect(sameCity("Нови-Сад", "novi sad")).toBe(true);
    expect(sameCity("Ереван", "Ereván")).toBe(true);
  });

  it("разные знакомые города — разные", () => {
    expect(sameCity("Белград", "Нови-Сад")).toBe(false);
    expect(sameCity("Belgrade", "Yerevan")).toBe(false);
  });

  it("незнакомые сравниваются по нормализованной строке", () => {
    expect(sameCity("Крагуевац", "  КРАГУЕВАЦ ")).toBe(true);
    expect(sameCity("Крагуевац", "Ниш")).toBe(false);
  });

  it("знакомый и незнакомый — не один город", () => {
    expect(sameCity("Белград", "Тбилиси")).toBe(false);
  });
});
