import { describe, expect, it } from "vitest";
import { AURA_SHAPES, pickAura } from "./aura";

describe("pickAura", () => {
  it("одна карточка — одна картинка навсегда", () => {
    expect(pickAura("Джазовый вечер")).toEqual(pickAura("Джазовый вечер"));
  });

  it("лента не одинаковая: на десятке карточек разные фигуры и палитры", () => {
    const picks = Array.from({ length: 12 }, (_, i) => pickAura(`card-${i}`));
    expect(new Set(picks.map((p) => p.shape)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(picks.map((p) => p.palette)).size).toBeGreaterThanOrEqual(4);
  });

  it("тихое настроение не берёт тёплых палитр", () => {
    for (let i = 0; i < 40; i++) {
      expect(["dusk", "sky", "mint", "butter", "lilac"]).toContain(
        pickAura(`quiet-${i}`, "silver").palette,
      );
    }
  });

  it("за много карточек встречается каждая фигура", () => {
    const shapes = new Set(Array.from({ length: 200 }, (_, i) => pickAura(`s${i}`).shape));
    expect(shapes.size).toBe(AURA_SHAPES.length);
  });
});
