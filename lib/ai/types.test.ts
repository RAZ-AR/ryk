import { describe, expect, it } from "vitest";
import { normalizeWish } from "./types";

/*
 * Ответ модели — недоверенный ввод: провайдер может вернуть лишние поля,
 * неизвестную категорию или строку вместо числа. Проверяем, что мусор
 * не доезжает до БД.
 */

describe("normalizeWish", () => {
  it("принимает корректный ответ", () => {
    expect(normalizeWish({ category: "NATURE", budget: 1500, timing: "SOON" })).toEqual({
      category: "NATURE",
      budget: 1500,
      timing: "SOON",
    });
  });

  it("отбрасывает неизвестную категорию", () => {
    expect(normalizeWish({ category: "TRAVEL", budget: 0, timing: "SOON" })).toBeNull();
  });

  it("подставляет SOMEDAY при неизвестном сроке", () => {
    const res = normalizeWish({ category: "JOY", budget: 0, timing: "NEXT_YEAR" });
    expect(res?.timing).toBe("SOMEDAY");
  });

  it("нулевой и отрицательный бюджет превращает в null", () => {
    expect(normalizeWish({ category: "JOY", budget: 0, timing: "SOON" })?.budget).toBeNull();
    expect(normalizeWish({ category: "JOY", budget: -5, timing: "SOON" })?.budget).toBeNull();
  });

  it("округляет дробный бюджет", () => {
    expect(normalizeWish({ category: "JOY", budget: 1499.6, timing: "SOON" })?.budget).toBe(1500);
  });

  it("игнорирует бюджет неверного типа", () => {
    expect(normalizeWish({ category: "JOY", budget: "дорого", timing: "SOON" })?.budget).toBeNull();
  });

  it("отклоняет мусор", () => {
    expect(normalizeWish(null)).toBeNull();
    expect(normalizeWish("строка")).toBeNull();
    expect(normalizeWish({})).toBeNull();
  });
});
