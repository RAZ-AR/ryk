import { describe, expect, it } from "vitest";
import { normalizeDisplayName } from "./displayName";

describe("normalizeDisplayName", () => {
  it("схлопывает пробелы и обрезает до 60 знаков", () => {
    expect(normalizeDisplayName("  Аня   Петрова ")).toBe("Аня Петрова");
    expect(normalizeDisplayName("я".repeat(80))).toHaveLength(60);
  });

  it("пусто — null", () => {
    expect(normalizeDisplayName("   ")).toBeNull();
    expect(normalizeDisplayName(null)).toBeNull();
  });

  it("то же, что в Telegram, — null: обращаемся по Telegram", () => {
    expect(normalizeDisplayName(" Аня ", "Аня")).toBeNull();
    expect(normalizeDisplayName("Анна", "Аня")).toBe("Анна");
  });
});
