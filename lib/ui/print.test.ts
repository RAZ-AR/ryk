import { describe, expect, it } from "vitest";
import { PRINT_SHAPES, pickPrint, printPath } from "./print";

describe("pickPrint", () => {
  it("одна карточка — одна картинка навсегда", () => {
    expect(pickPrint("Джазовый вечер")).toEqual(pickPrint("Джазовый вечер"));
    expect(printPath("Джазовый вечер").d).toBe(printPath("Джазовый вечер").d);
  });

  it("лента не одинаковая: на десятке карточек разные фигуры", () => {
    const shapes = new Set(Array.from({ length: 12 }, (_, i) => pickPrint(`card-${i}`).shape));
    expect(shapes.size).toBeGreaterThanOrEqual(4);
  });

  it("за много карточек встречается каждая фигура", () => {
    const shapes = new Set(Array.from({ length: 200 }, (_, i) => pickPrint(`s${i}`).shape));
    expect(shapes.size).toBe(PRINT_SHAPES.length);
  });

  it("сердце не переворачиваем", () => {
    for (let i = 0; i < 200; i++) {
      const p = pickPrint(`h${i}`);
      if (p.shape === "heart") expect(p.turn).toBe(0);
    }
  });
});

describe("printPath", () => {
  it("пропорции берёт из ratio", () => {
    const p = printPath("x", { ratio: 0.75, cols: 40 });
    expect(p.width).toBe(400);
    expect(p.height).toBe(300);
  });

  it("у каждой фигуры есть точки, и все они внутри картинки", () => {
    for (const shape of PRINT_SHAPES) {
      const p = printPath("seed", { shape });
      expect(p.dots).toBeGreaterThan(100);
      const xs = [...p.d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
      for (const [x, y] of xs) {
        expect(x).toBeGreaterThanOrEqual(-1);
        expect(x).toBeLessThanOrEqual(p.width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(p.height);
      }
    }
  });

  it("края растворяются: у самой кромки точек нет", () => {
    const p = printPath("edge", { shape: "glow" });
    const ys = [...p.d.matchAll(/M-?[\d.]+ (-?[\d.]+)/g)].map((m) => +m[1]);
    expect(Math.min(...ys)).toBeGreaterThan(p.height * 0.03);
    expect(Math.max(...ys)).toBeLessThan(p.height * 0.97);
  });

  it("бледный оттиск — меньше краски", () => {
    const full = printPath("faint", { shape: "glow" }).d.length;
    const faint = printPath("faint", { shape: "glow", gain: 0.35 }).d.length;
    expect(faint).toBeLessThan(full);
  });
});
